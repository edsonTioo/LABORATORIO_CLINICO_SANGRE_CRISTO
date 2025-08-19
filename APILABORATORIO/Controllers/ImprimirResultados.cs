using APILABORATORIO.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using System.Globalization; // Para CultureInfo
using System; // Para NumberStyles (aunque normalmente ya está presente)
using System.Text.RegularExpressions;

namespace LaboratorioClinico.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ImprimirResultados : ControllerBase
    {
        private readonly LaboratorioClinicoContext _context;

        public ImprimirResultados(LaboratorioClinicoContext context)
        {
            _context = context;
        }

        // Endpoint para buscar pacientes por nombre
        [HttpGet("buscar-paciente")]
        public async Task<IActionResult> BuscarPacientePorNombre([FromQuery] string nombre)
        {
            try
            {
                var pacientes = await _context.Clientes
                    .Where(c => c.Nombre.Contains(nombre))
                    .Select(c => new
                    {
                        c.Idcliente,
                        c.Nombre,
                        c.Genero,
                        OrdenesCount = c.Ordens.Count(o => o.Estado == "COMPLETADO")
                    })
                    .Take(10)
                    .ToListAsync();

                return Ok(pacientes);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al buscar pacientes: {ex.Message}");
            }
        }

        // Endpoint para obtener exámenes de un paciente
        [HttpGet("examenes-paciente/{idCliente}")]
        public async Task<IActionResult> ObtenerExamenesPorPaciente(int idCliente)
        {
            try
            {
                var examenes = await _context.Ordens
                    .Where(o => o.Idcliente == idCliente && o.Estado == "COMPLETADO")
                    .SelectMany(o => o.DetalleOrdens)
                    .Select(d => new
                    {
                        d.IddetalleOrden,
                        d.IdtipoExamenNavigation.NombreExamen,
                        d.IdtipoExamenNavigation.Descripcion,
                        FechaOrden = d.IdordenNavigation.FechaOrden,
                        d.IdordenNavigation.Estado
                    })
                    .Distinct()
                    .ToListAsync();

                return Ok(examenes);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al obtener exámenes: {ex.Message}");
            }
        }


        private double ExtraerPrimerNumero(string input)
        {
            if (string.IsNullOrWhiteSpace(input)) return 0;

            var match = Regex.Match(input.Replace(",", ""), @"[-+]?\d*\.?\d+");
            if (match.Success && double.TryParse(match.Value, NumberStyles.Any, CultureInfo.InvariantCulture, out double result))
            {
                return result;
            }
            return 0;
        }

        private double ExtraerSegundoNumero(string input)
        {
            if (string.IsNullOrWhiteSpace(input)) return 0;

            var matches = Regex.Matches(input.Replace(",", ""), @"[-+]?\d*\.?\d+");
            if (matches.Count > 1 && double.TryParse(matches[1].Value, NumberStyles.Any, CultureInfo.InvariantCulture, out double result))
            {
                return result;
            }
            else if (matches.Count == 1 && double.TryParse(matches[0].Value, NumberStyles.Any, CultureInfo.InvariantCulture, out double singleValue))
            {
                return singleValue; // Para casos como "Menor de 35"
            }
            return 0;
        }
        private string FormatearGenero(string genero)
        {
            if (string.IsNullOrEmpty(genero))
                return "N/A";

            return genero.ToUpper() switch
            {
                "M" => "Masculino",
                "F" => "Femenino",
                _ => genero // Si no es M ni F, devuelve el valor original
            };
        }
        //metodo para verificar el resultado con el valor de referencia y poner en negrita
        private static bool IsResultOutOfReferenceRange(string resultado, string valorReferencia, string tipoExamen)
        {
            if (string.IsNullOrWhiteSpace(resultado)) return false;
            if (string.IsNullOrWhiteSpace(valorReferencia)) return false;

            // Extraer solo el número del resultado (admite decimales, comas y negativos)
            string resultadoNumStr = Regex.Match(resultado.Replace(",", ""), @"[-+]?\d*\.?\d+").Value;
            if (!double.TryParse(resultadoNumStr, NumberStyles.Any, CultureInfo.InvariantCulture, out double resultadoNum))
            {
                return false; // No es un número válido
            }

            // Extraer todos los números del valor de referencia (ignorando texto/letras)
            var matches = Regex.Matches(valorReferencia.Replace(",", ""), @"[-+]?\d*\.?\d+");
            var numerosReferencia = matches.Select(m => double.Parse(m.Value, CultureInfo.InvariantCulture)).ToList();

            // Diferentes patrones de valores de referencia
            if (numerosReferencia.Count == 2) // Rango: X - Y
            {
                double min = numerosReferencia[0];
                double max = numerosReferencia[1];
                return resultadoNum < min || resultadoNum > max;
            }
            else if (numerosReferencia.Count == 1) // Valor único: X
            {
                // Verificar si el texto sugiere un límite superior o inferior
                if (Regex.IsMatch(valorReferencia, @"(hasta|menor|<\s*$)", RegexOptions.IgnoreCase))
                {
                    return resultadoNum > numerosReferencia[0]; // Límite superior
                }
                else if (Regex.IsMatch(valorReferencia, @"(mayor|>\s*$)", RegexOptions.IgnoreCase))
                {
                    return resultadoNum < numerosReferencia[0]; // Límite inferior
                }
                else
                {
                    // Por defecto, tratar como límite superior
                    return resultadoNum > numerosReferencia[0];
                }
            }
            else if (numerosReferencia.Count > 2) // Rangos múltiples (ej: Adultos: X-Y Niños: A-B)
            {
                // Tomar el primer rango por defecto (Adultos)
                double min = numerosReferencia[0];
                double max = numerosReferencia[1];
                return resultadoNum < min || resultadoNum > max;
            }

            return false; // No se pudo determinar el rango
        }

        // Endpoint para generar reporte de un examen específico
        [HttpGet("generar-reporte/{idDetalleOrden}")]
        public async Task<IActionResult> GenerarReporteExamen(int idDetalleOrden)
        {
            try
            {
                var exePath = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
                var imagePath = Path.Combine(exePath, "img", "logo.jpeg");
                byte[] imageBytes = System.IO.File.ReadAllBytes(imagePath);

                // Obtener datos del detalle de orden
                var detalleOrden = await _context.DetalleOrdens
                    .Include(d => d.IdordenNavigation)
                        .ThenInclude(o => o.IdclienteNavigation)
                    .Include(d => d.IdordenNavigation)
                        .ThenInclude(o => o.IdmedicoNavigation)
                    .Include(d => d.IdtipoExamenNavigation)
                    .Include(d => d.ResultadoExamen)
                        .ThenInclude(r => r.IdparametroNavigation)
                    .FirstOrDefaultAsync(d => d.IddetalleOrden == idDetalleOrden);

                if (detalleOrden == null)
                    return NotFound("Detalle de orden no encontrado");

                var fechaOrden = detalleOrden.IdordenNavigation.FechaOrden ?? DateTime.Now;
                var numeroMuestra = detalleOrden.IdordenNavigation.NumeroMuestra;

                var resultadosFiltrados = detalleOrden.ResultadoExamen
                    .Where(r => !string.IsNullOrWhiteSpace(r.Resultado))
                    .AsEnumerable()
                    .OrderBy(r => r.IdparametroNavigation == null || string.IsNullOrEmpty(r.IdparametroNavigation.Subtitulo) ? 0 : 1)
                    .ThenBy(r => r.Idparametro)
                    .ThenBy(r => r.IdparametroNavigation?.Subtitulo)
                    .ToList();

                if (!resultadosFiltrados.Any())
                    return NotFound("No hay resultados válidos para este examen");

                var edad = detalleOrden.IdordenNavigation.IdclienteNavigation.FechaNacimiento.HasValue ?
                    DateTime.Now.Year - detalleOrden.IdordenNavigation.IdclienteNavigation.FechaNacimiento.Value.Year : 0;
                // Dentro del método GenerarReporteExamen, antes de procesar los resultados:
                var notaParametro = resultadosFiltrados.FirstOrDefault(r =>
                    r.NombreParametro != null &&
                    r.NombreParametro.Equals("NOTA", StringComparison.OrdinalIgnoreCase));

                // Filtrar el parámetro NOTA de los resultados que van en la tabla
                resultadosFiltrados = resultadosFiltrados
                    .Where(r => r.NombreParametro == null ||
                           !r.NombreParametro.Equals("NOTA", StringComparison.OrdinalIgnoreCase))
                    .ToList();

                // Generar PDF
                var document = Document.Create(container =>
                {
                    container.Page(page =>
                    {
                        page.Size(PageSizes.A4);
                        page.Margin(30);
                        page.DefaultTextStyle(x => x.FontSize(10).FontFamily("Times New Roman"));

                        // Encabezado
                        page.Header().Column(column =>
                        {
                            column.Item().Row(row =>
                            {
                                // Reducir el espacio de la imagen o eliminarlo si no es necesario
                                row.RelativeItem(1).AlignLeft().Image(imageBytes, ImageScaling.FitWidth); // Ajustado a 1

                                // Texto principal con espacio relativo mayor
                                row.RelativeItem(3).Column(textColumn =>
                                {
                                    textColumn.Item().AlignCenter().Text("Laboratorio Clínico").Bold().Italic().FontSize(20).FontColor("#1F3864");
                                    textColumn.Item().AlignCenter().Text("Sangre de Cristo").Bold().Italic().FontSize(20).FontColor("#1F3864");
                                    textColumn.Item().AlignCenter().Text("Lic. Miurell Gutiérrez Rivera").Italic().FontSize(12).FontColor("#1F3864");
                                    textColumn.Item().AlignCenter().Text("Lic. Alvaro Bracamonte Nicaragua").Italic().FontSize(12).FontColor("#1F3864");
                                });
                                // Espacio equilibrador a la derecha
                                row.RelativeItem(1); // Espacio vacío del mismo tamaño que la imagen
                            });

                            column.Item().PaddingTop(5).LineHorizontal(1).LineColor(Colors.Grey.Medium);
                            column.Item().PaddingVertical(10);
                        });

                        // Pie de página
                        page.Footer().Column(column =>
                        {
                            column.Item().AlignRight().PaddingBottom(5).Text("________________________").FontSize(10);
                            column.Item().PaddingBottom(25);
                            column.Item().PaddingTop(10).AlignCenter().Text("Tu confianza, es nuestra satisfacción").Bold().Italic().FontColor("#1F3864");
                            column.Item().PaddingBottom(20);
                            column.Item().AlignCenter().Text("Dirección: Casa natal de Rubén Darío 4 Cuadras al este, Ciudad Darío, Matagalpa.").Italic();
                            column.Item().AlignCenter().Text("Cel: 85052997").Italic();
                            column.Item().AlignCenter().Text("Correo electrónico: Labsandecris@gmail.com").Italic();
                        });

                        // Contenido
                        page.Content().Column(column =>
                        {
                            // Datos del paciente
                            column.Item().Row(row =>
                            {
                                row.RelativeItem().Text(text =>
                                {
                                    text.Span("Paciente: ").Bold().FontSize(12.5F);
                                    text.Span(detalleOrden.IdordenNavigation.IdclienteNavigation.Nombre ?? "N/A").FontSize(12.5F);
                                });

                                row.RelativeItem().AlignRight().Text(text =>
                                {
                                    text.Span("Sexo - Edad: ").Bold().FontSize(12.5F);
                                    // Busca todas las instancias donde muestras el género y cámbialas así:
                                    text.Span($"{FormatearGenero(detalleOrden.IdordenNavigation.IdclienteNavigation.Genero)} - {edad} Años").FontSize(12.5F);
                                });
                            });

                            column.Item().Row(row =>
                            {
                                row.RelativeItem().Text(text =>
                                {
                                    text.Span("Médico: ").Bold().FontSize(12.5F);
                                    text.Span(detalleOrden.IdordenNavigation.IdmedicoNavigation?.Nombre ?? "N/A").FontSize(12.5F);
                                });

                                row.RelativeItem().AlignRight().Text(text =>
                                {
                                    text.Span("Núm. Muestra: ").Bold().FontSize(12.5F);
                                    text.Span(numeroMuestra.ToString()).FontSize(12.5F);
                                });
                            });

                            column.Item().Row(row =>
                            {
                                row.RelativeItem().Text(text =>
                                {
                                    text.Span("Mx Recepcionado: ").Bold().FontSize(12.5F);
                                    text.Span(detalleOrden.IdordenNavigation.FechaOrden?.ToString("dd/MM/yyyy")).FontSize(12.5F);
                                });

                                row.RelativeItem().AlignRight().Text(text =>
                                {
                                    text.Span("Emisión de resultado: ").Bold().FontSize(12.5F);
                                    text.Span(detalleOrden.IdordenNavigation.FechaEntrega?.ToString("dd/MM/yyyy") ?? "N/A").FontSize(12.5F);
                                });
                            });

                            // Título del examen

                            var tituloExamen = detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("CITOLOGÍA FECAL") ||
                                               detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("TINCION WRIGTH")
                                ? "PARASITOLOGÍA"
                                : detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper();


                            column.Item().PaddingTop(15).AlignCenter().Text(tituloExamen).Bold().FontSize(14);
                            column.Item().PaddingBottom(20);

                            // EXÁMENES DIVERSOS
                            if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("EXÁMENES DIVERSOS"))
                            {
                                var listaResultados = resultadosFiltrados.ToList();
                                var resultadosPorPagina = new List<List<ResultadoExaman>>();
                                int resultadosPorPaginaCount = 15;

                                // Primero separamos los datos en las 3 categorías
                                var muestras = listaResultados
                                    .Where(r => r.NombreParametro != null && r.NombreParametro.ToUpper().Contains("MUESTRA"))
                                    .OrderBy(r => r.Idparametro)
                                    .ToList();

                                var examenes = listaResultados
                                    .Where(r => r.NombreParametro != null &&
                                           !r.NombreParametro.ToUpper().Contains("MUESTRA") &&
                                           !r.NombreParametro.ToUpper().Contains("RESULTADO") &&
                                           !r.NombreParametro.ToUpper().Contains("DIAGNÓSTICO"))
                                    .OrderBy(r => r.Idparametro)
                                    .ToList();

                                var resultados = listaResultados
                                    .Where(r => r.NombreParametro != null &&
                                           (r.NombreParametro.ToUpper().Contains("RESULTADO") ||
                                            r.NombreParametro.ToUpper().Contains("DIAGNÓSTICO")))
                                    .OrderBy(r => r.Idparametro)
                                    .ToList();

                                // Creamos una lista combinada ordenada
                                var listaCombinada = new List<ResultadoExaman>();
                                int maxCount = new[] { muestras.Count, examenes.Count, resultados.Count }.Max();

                                for (int i = 0; i < maxCount; i++)
                                {
                                    if (i < muestras.Count) listaCombinada.Add(muestras[i]);
                                    if (i < examenes.Count) listaCombinada.Add(examenes[i]);
                                    if (i < resultados.Count) listaCombinada.Add(resultados[i]);
                                }

                                // Paginamos la lista combinada
                                for (int i = 0; i < listaCombinada.Count; i += resultadosPorPaginaCount)
                                {
                                    resultadosPorPagina.Add(listaCombinada
                                        .Skip(i)
                                        .Take(resultadosPorPaginaCount)
                                        .ToList());
                                }

                                for (int i = 0; i < resultadosPorPagina.Count; i++)
                                {
                                    var resultadosPagina = resultadosPorPagina[i];

                                    column.Item().Table(diversosTable =>
                                    {
                                        diversosTable.ColumnsDefinition(columns =>
                                        {
                                            columns.RelativeColumn(3);
                                            columns.RelativeColumn(4);
                                            columns.RelativeColumn(3);
                                        });

                                        if (i == 0)
                                        {
                                            diversosTable.Header(header =>
                                            {
                                                header.Cell().Element(CellStyle).AlignLeft().Text("     MUESTRA").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                header.Cell().Element(CellStyle).AlignCenter().Text("EXAMEN").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                header.Cell().Element(CellStyle).AlignCenter().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                            });
                                        }

                                        // Procesamos en grupos de 3 (muestra, examen, resultado)
                                        for (int j = 0; j < resultadosPagina.Count; j += 3)
                                        {
                                            var muestra = resultadosPagina[j];
                                            var examen = j + 1 < resultadosPagina.Count ? resultadosPagina[j + 1] : null;
                                            var resultado = j + 2 < resultadosPagina.Count ? resultadosPagina[j + 2] : null;

                                            // Verificamos los tipos para asegurarnos de que están en la columna correcta
                                            if (muestra != null && !muestra.NombreParametro.ToUpper().Contains("MUESTRA"))
                                            {
                                                // Si no es muestra, rotamos los valores
                                                var temp = muestra;
                                                muestra = examen;
                                                examen = resultado;
                                                resultado = temp;
                                            }

                                            diversosTable.Cell().Element(CellContentStyle).PaddingHorizontal(12).AlignLeft()
                                                .Text(muestra?.Resultado ?? "").FontSize(12);
                                            diversosTable.Cell().Element(CellContentStyle).AlignCenter()
                                                .Text(examen?.NombreParametro ?? examen?.Resultado ?? "").FontSize(12);
                                            diversosTable.Cell().Element(CellContentStyle).AlignCenter()
                                                .Text(resultado?.Resultado ?? "").FontSize(12);
                                        }
                                    });
                                }
                            }

                            else if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("PARASITOLOGÍA"))
                            {
                                // Primero mostramos la tabla estándar para otros parámetros
                                var parametrosNormales = resultadosFiltrados
                                    .Where(r => r.NombreParametro != null &&
                                           !r.NombreParametro.ToUpper().Contains("MUESTRA") &&
                                           !r.NombreParametro.ToUpper().Contains("EXAMEN") &&
                                           !r.NombreParametro.ToUpper().Contains("RESULTADO") &&
                                           !r.NombreParametro.ToUpper().Contains("HELICOBACTER PYLORI") &&
                                           !r.NombreParametro.ToUpper().Contains("SANGRE OCULTA (FOB)"))
                                    .ToList();

                                if (parametrosNormales.Any())
                                {
                                    column.Item().Table(table =>
                                    {
                                        table.ColumnsDefinition(columns =>
                                        {
                                            columns.RelativeColumn(2.5f); // Parámetro
                                            columns.RelativeColumn(4); // Resultado
                                        });

                                        // Encabezado modificado (sin "VALORES DE REFERENCIA")
                                        table.Header(header =>
                                        {
                                            header.Cell().Element(CellStyle).AlignLeft().Text("      ANÁLISIS").Bold().FontColor(Colors.White).FontSize(12.5f);
                                            header.Cell().Element(CellStyle).AlignLeft().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                        });

                                        // Agregar descripción si existe
                                        if (!string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                        {
                                            table.Cell().ColumnSpan(2)
                                                .PaddingVertical(2)
                                                .Element(DescripcionStyle)
                                                .Text(detalleOrden.IdtipoExamenNavigation.Descripcion)
                                                .Bold()
                                                .FontSize(12);
                                        }

                                        string currentSubtitulo = null;
                                        foreach (var resultado in parametrosNormales)
                                        {
                                            var subtitulo = resultado.IdparametroNavigation?.Subtitulo;
                                            if (subtitulo != currentSubtitulo && !string.IsNullOrEmpty(subtitulo))
                                            {
                                                table.Cell().ColumnSpan(2)
                                                    .PaddingVertical(2)
                                                    .Element(SubtituloStyle)
                                                    .Text(subtitulo)
                                                    .Bold()
                                                    .FontSize(12);
                                                currentSubtitulo = subtitulo;
                                            }

                                            table.Cell().Element(ResultadoStyle).Text(resultado.NombreParametro ?? "").FontSize(12);
                                            table.Cell().Element(ResultadoStyle).Text(resultado.Resultado ?? "").FontSize(12);
                                        }
                                    });
                                }

                                // Tabla especial MUESTRA/EXAMEN/RESULTADO para Parasitología
                                var muestras = resultadosFiltrados
                                    .Where(r => r.NombreParametro != null && r.NombreParametro.ToUpper().Contains("MUESTRA"))
                                    .OrderBy(r => r.NombreParametro)
                                    .ToList();

                                var examenesEspeciales = resultadosFiltrados
                                    .Where(r => r.NombreParametro != null &&
                                           (r.NombreParametro.ToUpper().Contains("HELICOBACTER PYLORI") ||
                                            r.NombreParametro.ToUpper().Contains("SANGRE OCULTA (FOB)")))
                                    .OrderBy(r => r.NombreParametro)
                                    .ToList();

                                var resultadosEspeciales = resultadosFiltrados
                                    .Where(r => r.NombreParametro != null && r.NombreParametro.ToUpper().Contains("RESULTADO"))
                                    .OrderBy(r => r.NombreParametro)
                                    .ToList();

                                // Mostrar tabla especial si tenemos al menos un conjunto completo
                                if (muestras.Any() && examenesEspeciales.Any() && resultadosEspeciales.Any())
                                {
                                    column.Item().PaddingTop(10).Table(parasitologiaTable =>
                                    {
                                        parasitologiaTable.ColumnsDefinition(columns =>
                                        {
                                            columns.RelativeColumn(2);
                                            columns.RelativeColumn(3);
                                            columns.RelativeColumn(2);
                                        });

                                        parasitologiaTable.Header(header =>
                                        {
                                            header.Cell().Element(CellStyle).AlignLeft().Text("     MUESTRA").Bold().FontColor(Colors.White).FontSize(12.5f);
                                            header.Cell().Element(CellStyle).AlignCenter().Text("EXAMEN").Bold().FontColor(Colors.White).FontSize(12.5f);
                                            header.Cell().Element(CellStyle).AlignCenter().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                        });

                                        // Determinamos el número máximo de filas a mostrar
                                        int maxRows = Math.Min(muestras.Count, Math.Min(examenesEspeciales.Count, resultadosEspeciales.Count));

                                        for (int i = 0; i < maxRows; i++)
                                        {
                                            var muestra = muestras[i];
                                            var examen = examenesEspeciales[i];
                                            var resultado = resultadosEspeciales[i];

                                            parasitologiaTable.Cell().Element(ResultadoStyle).PaddingHorizontal(12).Text(muestra.Resultado ?? "").FontSize(12);
                                            parasitologiaTable.Cell().Element(ResultadoStyle).AlignCenter().Text(examen.NombreParametro ?? "").FontSize(12);
                                            parasitologiaTable.Cell().Element(ResultadoStyle).Text(resultado.Resultado ?? "").AlignCenter().FontSize(12);
                                        }
                                    });
                                }
                            }
                            else if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("TINCION WRIGTH"))
                            {
                                column.Item().Table(table =>
                                {
                                    table.ColumnsDefinition(columns =>
                                    {
                                        columns.RelativeColumn(2.5f); // Parámetro
                                        columns.RelativeColumn(4);    // Resultado
                                    });

                                    // Encabezado modificado (sin "VALORES DE REFERENCIA")
                                    table.Header(header =>
                                    {
                                        header.Cell().Element(CellStyle).AlignLeft().Text("      ANÁLISIS").Bold().FontColor(Colors.White).FontSize(12.5f);
                                        header.Cell().Element(CellStyle).AlignLeft().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                    });

                                    // Agregar descripción si existe
                                    if (!string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                    {
                                        table.Cell().ColumnSpan(2)
                                            .PaddingVertical(2)
                                            .Element(DescripcionStyle)
                                            .Text(detalleOrden.IdtipoExamenNavigation.Descripcion)
                                            .Bold()
                                            .FontSize(12);
                                    }

                                    string currentSubtitulo = null;
                                    foreach (var resultado in resultadosFiltrados)
                                    {
                                        var subtitulo = resultado.IdparametroNavigation?.Subtitulo;
                                        if (subtitulo != currentSubtitulo && !string.IsNullOrEmpty(subtitulo))
                                        {
                                            table.Cell().ColumnSpan(2)
                                                .PaddingVertical(2)
                                                .Element(SubtituloStyle)
                                                .Text(subtitulo)
                                                .Bold()
                                                .FontSize(12);
                                            currentSubtitulo = subtitulo;
                                        }

                                        table.Cell().Element(ResultadoStyle).Text(resultado.NombreParametro ?? "").FontSize(12);
                                        table.Cell().Element(ResultadoStyle).Text(resultado.Resultado ?? "").FontSize(12);
                                    }
                                });
                            }
                            else if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("HEMATOLOGÍA"))
                            {
                                var listaResultados = resultadosFiltrados.ToList();
                                var resultadosPorPagina = new List<List<ResultadoExaman>>();
                                int resultadosPorPaginaCount = 15;

                                // Obtener el género del paciente
                                var generoPaciente = detalleOrden.IdordenNavigation.IdclienteNavigation.Genero?.ToUpper() ?? "M";
                                var esNino = edad < 18;

                                // Variables para verificar relación entre Segmentados y Linfocitos
                                double valorSegmentados = 0;
                                double valorLinfocitos = 0;
                                bool segmentadosFueraRango = false;
                                bool linfocitosFueraRango = false;
                                bool marcarSoloSegmentados = false;
                                bool marcarSoloLinfocitos = false;

                                // Primera pasada para verificar Segmentados y Linfocitos
                                foreach (var resultado in listaResultados)
                                {
                                    var nombreParametro = resultado.NombreParametro ?? "";
                                    var valorResultado = resultado.Resultado ?? "";
                                    var valorReferencia = resultado.IdparametroNavigation?.ValorReferencia ?? "";

                                    if (nombreParametro.ToUpper().Contains("SEGMENTADOS"))
                                    {
                                        segmentadosFueraRango = IsResultOutOfReferenceRange(valorResultado, valorReferencia, "HEMATOLOGÍA");
                                        valorSegmentados = ExtraerPrimerNumero(valorResultado);
                                    }
                                    else if (nombreParametro.ToUpper().Contains("LINFOCITOS"))
                                    {
                                        linfocitosFueraRango = IsResultOutOfReferenceRange(valorResultado, valorReferencia, "HEMATOLOGÍA");
                                        valorLinfocitos = ExtraerPrimerNumero(valorResultado);
                                    }
                                }

                                // Lógica para determinar qué marcar en negrita
                                if (segmentadosFueraRango && linfocitosFueraRango)
                                {
                                    if (valorSegmentados > valorLinfocitos)
                                    {
                                        marcarSoloSegmentados = true;
                                    }
                                    else
                                    {
                                        marcarSoloLinfocitos = true;
                                    }
                                }
                                else if (segmentadosFueraRango)
                                {
                                    marcarSoloSegmentados = true;
                                }
                                else if (linfocitosFueraRango)
                                {
                                    marcarSoloLinfocitos = true;
                                }

                                for (int i = 0; i < listaResultados.Count; i += resultadosPorPaginaCount)
                                {
                                    resultadosPorPagina.Add(listaResultados
                                        .Skip(i)
                                        .Take(resultadosPorPaginaCount)
                                        .ToList());
                                }

                                for (int i = 0; i < resultadosPorPagina.Count; i++)
                                {
                                    var resultadosPagina = resultadosPorPagina[i];

                                    if (i == 0)
                                    {
                                        column.Item().Table(headerTable =>
                                        {
                                            headerTable.ColumnsDefinition(columns =>
                                            {
                                                columns.RelativeColumn(3);
                                                columns.RelativeColumn(1.3f);
                                                columns.RelativeColumn(1);
                                                columns.RelativeColumn(2.5f);
                                            });

                                            headerTable.Header(header =>
                                            {
                                                header.Cell().Element(CellStyle).AlignLeft().Text("      ANÁLISIS").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                header.Cell().Element(CellStyle).AlignLeft().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                header.Cell().Element(CellStyle).Text("").Bold().FontColor(Colors.White);
                                                header.Cell().Element(CellStyle).AlignLeft().Text("VALORES DE REFERENCIA").Bold().FontColor(Colors.White).FontSize(12.5f);
                                            });

                                            if (!string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                            {
                                                headerTable.Cell().ColumnSpan(4)
                                                    .PaddingVertical(2)
                                                    .Element(DescripcionStyle)
                                                    .Text(detalleOrden.IdtipoExamenNavigation.Descripcion)
                                                    .Bold()
                                                    .FontSize(12);
                                            }
                                        });
                                    }

                                    column.Item().Table(resultsTable =>
                                    {
                                        resultsTable.ColumnsDefinition(columns =>
                                        {
                                            columns.RelativeColumn(3);
                                            columns.RelativeColumn(1.3f);
                                            columns.RelativeColumn(1);
                                            columns.RelativeColumn(2.5f);
                                        });

                                        string currentSubtitulo = null;
                                        foreach (var resultado in resultadosPagina)
                                        {
                                            var subtitulo = resultado.IdparametroNavigation?.Subtitulo;
                                            if (subtitulo != currentSubtitulo && !string.IsNullOrEmpty(subtitulo))
                                            {
                                                resultsTable.Cell().ColumnSpan(4)
                                                    .PaddingVertical(2)
                                                    .Element(SubtituloStyle)
                                                    .Text(subtitulo)
                                                    .Bold()
                                                    .FontSize(12);
                                                currentSubtitulo = subtitulo;
                                            }

                                            var nombreParametro = resultado.NombreParametro ?? "";
                                            var valorResultado = resultado.Resultado ?? "";
                                            var valorReferencia = resultado.IdparametroNavigation?.ValorReferencia ?? "";

                                            // Parámetros que van en negrita
                                            var parametrosNegrita = new[] { "ERITROCITOS", "LEUCOCITOS", "PLAQUETAS", "TIPO Y RH" };
                                            bool esParametroNegrita = parametrosNegrita.Any(p => nombreParametro.ToUpper().Contains(p));

                                            // Parámetros con valores por género
                                            var parametrosGenero = new[] { "HEMATOCRITO", "HEMOGLOBINA" };
                                            bool esParametroGenero = parametrosGenero.Any(p => nombreParametro.ToUpper().Contains(p));

                                            // Ajustar valores de referencia según género/edad
                                            if (esParametroNegrita || esParametroGenero)
                                            {
                                                if (nombreParametro.ToUpper().Contains("ERITROCITOS"))
                                                {
                                                    if (edad < 12)
                                                        valorReferencia = "4,000,000 - 5,200,000";
                                                    else if (generoPaciente == "F")
                                                        valorReferencia = "4,000,000 - 5,200,000";
                                                    else
                                                        valorReferencia = "4,400,000 - 6,000,000";
                                                }
                                                else if (nombreParametro.ToUpper().Contains("HEMATOCRITO"))
                                                {
                                                    if (edad < 12) valorReferencia = "37 - 47";  // Mismo que mujeres adultas
                                                    else if (generoPaciente == "F") valorReferencia = "37 - 47";
                                                    else valorReferencia = "39 - 53";  // Hombres adultos
                                                }
                                                else if (nombreParametro.ToUpper().Contains("HEMOGLOBINA"))
                                                {
                                                    if (edad < 12) valorReferencia = "12 - 16";  // Mismo que mujeres adultas
                                                    else if (generoPaciente == "F") valorReferencia = "12 - 16";
                                                    else valorReferencia = "14 - 18";  // Hombres adultos
                                                }
                                            }

                                            // Nombre del parámetro
                                            resultsTable.Cell().Element(ResultadoStyle).Text(text =>
                                            {
                                                if (esParametroNegrita) text.Span(nombreParametro).Bold().FontSize(12);
                                                else text.Span(nombreParametro).FontSize(12);
                                            });

                                            // Resultado - Caso especial para TIPO Y RH
                                            if (nombreParametro.ToUpper().Contains("TIPO Y RH"))
                                            {
                                                resultsTable.Cell().Element(ResultadoStyle).Text(text =>
                                                {
                                                    var resultadoUnido = (resultado.Resultado ?? "").Replace("\n", " ").Replace("\r", "");
                                                    text.Span(resultadoUnido).Bold().FontSize(11);
                                                });
                                            }
                                            else
                                            {
                                                // Comportamiento normal para otros parámetros
                                                resultsTable.Cell().Element(ResultadoStyle).Text(text =>
                                                {
                                                    bool fueraDeRango = IsResultOutOfReferenceRange(valorResultado, valorReferencia, "HEMATOLOGÍA");
                                                    bool mostrarNegrita = fueraDeRango &&
                                                                       ((nombreParametro.ToUpper().Contains("SEGMENTADOS") && marcarSoloSegmentados) ||
                                                                        (nombreParametro.ToUpper().Contains("LINFOCITOS") && marcarSoloLinfocitos) ||
                                                                       (!nombreParametro.ToUpper().Contains("SEGMENTADOS") &&
                                                                        !nombreParametro.ToUpper().Contains("LINFOCITOS") && fueraDeRango));

                                                    if (mostrarNegrita) text.Span(valorResultado).Bold().FontColor(Colors.Black).FontSize(12);
                                                    else text.Span(valorResultado).FontSize(12);
                                                });
                                            }

                                            resultsTable.Cell().Element(ResultadoStyle).PaddingLeft(-20).Text(resultado.IdparametroNavigation?.UnidadMedida ?? "").FontSize(12);
                                            resultsTable.Cell().Element(ResultadoStyle).Text(valorReferencia).FontSize(12);
                                        }
                                    });
                                }

                                // Nota al pie
                                column.Item().PaddingTop(10).Text("**Intervalos de referencias obtenidos del libro: Hematología, la sangre y sus enfermedades; 2da edición, 2009.")
                                    .FontSize(10);
                            }
                            else if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("QUÍMICA SANGUÍNEA"))
                            {
                                var listaResultados = resultadosFiltrados.ToList();
                                var resultadosPorPagina = new List<List<ResultadoExaman>>();
                                int resultadosPorPaginaCount = 15;

                                // Obtener el género del paciente
                                var generoPaciente = detalleOrden.IdordenNavigation.IdclienteNavigation.Genero?.ToUpper() ?? "M";
                                var esNino = edad < 18; // Asumiendo que menor de 18 años es niño

                                // Verificar si existe exactamente el parámetro "Glicohemoglobina A1C"
                                bool tieneGlicohemoglobina = listaResultados.Any(r =>
                                    r.NombreParametro != null &&
                                    r.NombreParametro.Equals("Glicohemoglobina A1C", StringComparison.OrdinalIgnoreCase));

                                for (int i = 0; i < listaResultados.Count; i += resultadosPorPaginaCount)
                                {
                                    resultadosPorPagina.Add(listaResultados
                                        .Skip(i)
                                        .Take(resultadosPorPaginaCount)
                                        .ToList());
                                }

                                for (int i = 0; i < resultadosPorPagina.Count; i++)
                                {
                                    var resultadosPagina = resultadosPorPagina[i];

                                    if (i == 0)
                                    {
                                        column.Item().Table(headerTable =>
                                        {
                                            headerTable.ColumnsDefinition(columns =>
                                            {
                                                columns.RelativeColumn(3);     // ANÁLISIS
                                                columns.RelativeColumn(1.3f);  // RESULTADO
                                                columns.RelativeColumn(1);     // UNIDAD DE MEDIDA
                                                columns.RelativeColumn(2.5f);  // VALORES DE REFERENCIA
                                            });

                                            headerTable.Header(header =>
                                            {
                                                header.Cell().Element(CellStyle).AlignLeft().Text("      ANÁLISIS").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                header.Cell().Element(CellStyle).AlignLeft().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                header.Cell().Element(CellStyle).Text("").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                header.Cell().Element(CellStyle).AlignLeft().Text("VALORES DE REFERENCIA").Bold().FontColor(Colors.White).FontSize(12.5f);
                                            });

                                            if (!string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                            {
                                                headerTable.Cell().ColumnSpan(4)
                                                    .PaddingVertical(2)
                                                    .Element(DescripcionStyle)
                                                    .Text(detalleOrden.IdtipoExamenNavigation.Descripcion)
                                                    .Bold()
                                                    .FontSize(12);
                                            }
                                        });
                                    }

                                    column.Item().Table(resultsTable =>
                                    {
                                        resultsTable.ColumnsDefinition(columns =>
                                        {
                                            columns.RelativeColumn(3);
                                            columns.RelativeColumn(1.3f);
                                            columns.RelativeColumn(1);
                                            columns.RelativeColumn(2.5f);
                                        });

                                        string currentSubtitulo = null;
                                        foreach (var resultado in resultadosPagina)
                                        {
                                            var subtitulo = resultado.IdparametroNavigation?.Subtitulo;
                                            if (subtitulo != currentSubtitulo && !string.IsNullOrEmpty(subtitulo))
                                            {
                                                resultsTable.Cell().ColumnSpan(4)
                                                    .PaddingVertical(2)
                                                    .Element(SubtituloStyle)
                                                    .Text(subtitulo)
                                                    .Bold()
                                                    .FontSize(12);
                                                currentSubtitulo = subtitulo;
                                            }

                                            var nombreParametro = resultado.NombreParametro ?? "";

                                            // Obtener el valor de referencia original
                                            string valorReferencia = resultado.IdparametroNavigation?.ValorReferencia ?? "";

                                            // Aplicar lógica de valores por género/edad para Química Sanguínea
                                            if (nombreParametro.ToUpper().Contains("CREATININA"))
                                            {
                                                if (edad < 10) // Niños menores de 10 años
                                                {
                                                    valorReferencia = "0.3 - 0.7 mg/dL";
                                                }
                                                else if (edad >= 10 && edad < 18) // Niños de 10 a 17 años
                                                {
                                                    valorReferencia = "0.7 - 1.4 mg/dL";
                                                }
                                                else if (generoPaciente == "F") // Mujeres adultas (18+)
                                                {
                                                    valorReferencia = "0.6 - 1.1 mg/dL";
                                                }
                                                else // Hombres adultos (18+)
                                                {
                                                    valorReferencia = "0.7 - 1.4 mg/dL";
                                                }
                                            }
                                            else if (nombreParametro.ToUpper().Contains("ÁCIDO ÚRICO") || nombreParametro.ToUpper().Contains("ACIDO URICO"))
                                            {
                                                if (generoPaciente == "F")
                                                    valorReferencia = "2.6 - 6.0 mg/dL";
                                                else
                                                    valorReferencia = "3.5 - 7.2 mg/dL";
                                            }
                                            else if (nombreParametro.ToUpper().Contains("TRANSAMINASA OXALACÉTICA") ||
                                                     nombreParametro.ToUpper().Contains("TGO") ||
                                                     nombreParametro.ToUpper().Contains("AST"))
                                            {
                                                if (generoPaciente == "F")
                                                    valorReferencia = "Menor de 31 U/L";
                                                else
                                                    valorReferencia = "Menor de 35 U/L";
                                            }
                                            else if (nombreParametro.ToUpper().Contains("TRANSAMINASA PIRÚVICA") ||
                                                     nombreParametro.ToUpper().Contains("TGP") ||
                                                     nombreParametro.ToUpper().Contains("ALT"))
                                            {
                                                if (generoPaciente == "F")
                                                    valorReferencia = "Menor de 31 U/L";
                                                else
                                                    valorReferencia = "Menor de 41 U/L";
                                            }
                                            else if (nombreParametro.ToUpper().Contains("LDH"))
                                            {
                                                if (generoPaciente == "F")
                                                    valorReferencia = "Menor de 247 U/L";
                                                else
                                                    valorReferencia = "Menor de 248 U/L";
                                            }

                                            resultsTable.Cell().Element(ResultadoStyle).Text(nombreParametro).FontSize(12);
                                            resultsTable.Cell().Element(ResultadoStyle).Text(text =>
                                            {
                                                bool esValorAnormal = IsResultOutOfReferenceRange(
                                                    resultado.Resultado ?? "",
                                                    valorReferencia,
                                                    "QUÍMICA SANGUÍNEA"
                                                );
                                                if (esValorAnormal)
                                                {
                                                    text.Span(resultado.Resultado ?? "").Bold().FontColor(Colors.Black).FontSize(12);
                                                }
                                                else
                                                {
                                                    text.Span(resultado.Resultado ?? "").FontSize(12);
                                                }
                                            });
                                            resultsTable.Cell().Element(ResultadoStyle).AlignLeft().PaddingLeft(-40).Text(resultado.IdparametroNavigation?.UnidadMedida ?? "").FontSize(12);
                                            resultsTable.Cell().Element(ResultadoStyle).Text(valorReferencia).FontSize(12);
                                        }
                                    });
                                }

                                // Mostrar notas solo si existe el parámetro exacto "Glicohemoglobina A1C"
                                if (tieneGlicohemoglobina)
                                {
                                    column.Item().PaddingTop(12).AlignCenter().Column(col =>
                                    {
                                        col.Item().Text(text =>
                                        {
                                            text.Span("VALORES DE REFERENCIA").Bold();
                                        });

                                        col.Item().PaddingLeft(10).Text(text =>
                                        {
                                            text.Span("- 4.5 a 5.6     Paciente no Diabético").FontSize(10);
                                        });

                                        col.Item().PaddingLeft(10).Text(text =>
                                        {
                                            text.Span("- 5.7 a 6.0     Riesgo de desarrollar Diabetes").FontSize(10);
                                        });

                                        col.Item().PaddingLeft(10).Text(text =>
                                        {
                                            text.Span("- 6.1 a 6.5     Alto riesgo de desarrollar Diabetes").FontSize(10);
                                        });

                                        col.Item().PaddingLeft(10).Text(text =>
                                        {
                                            text.Span("- Paciente diabético, mal controlado o con metabolismo desequilibrado mayor de 8.5%").FontSize(10);
                                        });
                                    });
                                }
                            }
                            else if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("SEROLOGÍA"))
                            {
                                var listaResultados = resultadosFiltrados.ToList();
                                var resultadosPorPagina = new List<List<ResultadoExaman>>();
                                int resultadosPorPaginaCount = 15;

                                for (int i = 0; i < listaResultados.Count; i += resultadosPorPaginaCount)
                                {
                                    resultadosPorPagina.Add(listaResultados
                                        .Skip(i)
                                        .Take(resultadosPorPaginaCount)
                                        .ToList());
                                }

                                for (int i = 0; i < resultadosPorPagina.Count; i++)
                                {
                                    var resultadosPagina = resultadosPorPagina[i];

                                    if (i == 0)
                                    {
                                        column.Item().Table(headerTable =>
                                        {
                                            headerTable.ColumnsDefinition(columns =>
                                            {
                                                columns.RelativeColumn(3);     // ANÁLISIS
                                                columns.RelativeColumn(1.3f);  // RESULTADO
                                                columns.RelativeColumn(1);     // UNIDAD DE MEDIDA (vacío en algunos casos)
                                                columns.RelativeColumn(2.5f);  // VALORES DE REFERENCIA
                                            });

                                            headerTable.Header(header =>
                                            {
                                                header.Cell().Element(CellStyle).AlignLeft().Text("      ANÁLISIS").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                header.Cell().Element(CellStyle).AlignLeft().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                header.Cell().Element(CellStyle).Text("").Bold().FontColor(Colors.White);
                                                header.Cell().Element(CellStyle).AlignLeft().Text("VALORES DE REFERENCIA").Bold().FontColor(Colors.White).FontSize(12.5f);
                                            });

                                            if (!string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                            {
                                                headerTable.Cell().ColumnSpan(4)
                                                    .PaddingVertical(2)
                                                    .Element(DescripcionStyle)
                                                    .Text(detalleOrden.IdtipoExamenNavigation.Descripcion)
                                                    .Bold()
                                                    .FontSize(12);
                                            }
                                        });
                                    }

                                    column.Item().Table(resultsTable =>
                                    {
                                        resultsTable.ColumnsDefinition(columns =>
                                        {
                                            columns.RelativeColumn(3);
                                            columns.RelativeColumn(1.3f);
                                            columns.RelativeColumn(1);
                                            columns.RelativeColumn(2.5f);
                                        });

                                        string currentSubtitulo = null;
                                        foreach (var resultado in resultadosPagina)
                                        {
                                            var subtitulo = resultado.IdparametroNavigation?.Subtitulo;
                                            if (subtitulo != currentSubtitulo && !string.IsNullOrEmpty(subtitulo))
                                            {
                                                resultsTable.Cell().ColumnSpan(4)
                                                    .PaddingVertical(2)
                                                    .Element(SubtituloStyle)
                                                    .Text(subtitulo)
                                                    .Bold()
                                                    .FontSize(12);
                                                currentSubtitulo = subtitulo;
                                            }

                                            var nombreParametro = resultado.NombreParametro ?? "";
                                            var valorResultado = resultado.Resultado ?? "";
                                            var valorReferencia = resultado.IdparametroNavigation?.ValorReferencia ?? "";

                                            // Nombre del parámetro
                                            resultsTable.Cell().Element(ResultadoStyle).Text(nombreParametro).FontSize(12);

                                            // Resultado (negrita si es anormal)
                                            bool esValorAnormal = IsResultOutOfReferenceRange(valorResultado, valorReferencia, "SEROLOGÍA");
                                            resultsTable.Cell().Element(ResultadoStyle).Text(text =>
                                            {
                                                if (esValorAnormal)
                                                    text.Span(valorResultado).Bold().FontColor(Colors.Black).FontSize(12);
                                                else
                                                    text.Span(valorResultado).FontSize(12);
                                            });

                                            // Unidad de medida (puede ir vacío si no aplica)
                                            resultsTable.Cell().Element(ResultadoStyle).PaddingLeft(-20).Text(resultado.IdparametroNavigation?.UnidadMedida ?? "").FontSize(12);

                                            // Valor de referencia
                                            resultsTable.Cell().Element(ResultadoStyle).Text(valorReferencia).FontSize(12);
                                        }
                                    });
                                }
                            }
                            else if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("CITOLOGÍA FECAL"))
                            {
                                // Estilo especial para Citología Fecal con más espacio vertical pero sin bordes
                                Func<IContainer, IContainer> CeldaAltaStyle = cell => cell
                                    .PaddingVertical(10)  // Aumentamos el espacio vertical (antes era ~5)
                                    .PaddingHorizontal(5);

                                var listaResultados = resultadosFiltrados.ToList();
                                var resultadosPorPagina = new List<List<ResultadoExaman>>();
                                int resultadosPorPaginaCount = 10;  // Reducir un poco por el mayor espacio

                                for (int i = 0; i < listaResultados.Count; i += resultadosPorPaginaCount)
                                {
                                    resultadosPorPagina.Add(listaResultados
                                        .Skip(i)
                                        .Take(resultadosPorPaginaCount)
                                        .ToList());
                                }

                                for (int i = 0; i < resultadosPorPagina.Count; i++)
                                {
                                    var resultadosPagina = resultadosPorPagina[i];

                                    if (i == 0)
                                    {
                                        column.Item().Table(headerTable =>
                                        {
                                            headerTable.ColumnsDefinition(columns =>
                                            {
                                                columns.RelativeColumn(3);     // ANÁLISIS
                                                columns.RelativeColumn(1.3f);  // RESULTADO
                                                columns.RelativeColumn(1);     // UNIDAD DE MEDIDA
                                                columns.RelativeColumn(2.5f);  // VALORES DE REFERENCIA
                                            });

                                            headerTable.Header(header =>
                                            {
                                                header.Cell().Background("#0E5460").AlignLeft().Text("      ANÁLISIS").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                header.Cell().Background("#0E5460").AlignLeft().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                header.Cell().Background("#0E5460").Text("").Bold().FontColor(Colors.White);
                                                header.Cell().Background("#0E5460").AlignLeft().Text("VALORES DE REFERENCIA").Bold().FontColor(Colors.White).FontSize(12.5f);
                                            });

                                            if (!string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                            {
                                                headerTable.Cell().ColumnSpan(4)
                                                    .PaddingVertical(10)  // Más espacio para la descripción
                                                    .Element(DescripcionStyleSinBordes)
                                                    .Text(detalleOrden.IdtipoExamenNavigation.Descripcion)
                                                    .Bold()
                                                    .FontSize(12);
                                            }
                                        });
                                    }

                                    column.Item().Table(resultsTable =>
                                    {
                                        resultsTable.ColumnsDefinition(columns =>
                                        {
                                            columns.RelativeColumn(3);
                                            columns.RelativeColumn(1.3f);
                                            columns.RelativeColumn(1);
                                            columns.RelativeColumn(2.5f);
                                        });

                                        string currentSubtitulo = null;
                                        foreach (var resultado in resultadosPagina)
                                        {
                                            var subtitulo = resultado.IdparametroNavigation?.Subtitulo;
                                            if (subtitulo != currentSubtitulo && !string.IsNullOrEmpty(subtitulo))
                                            {
                                                resultsTable.Cell().ColumnSpan(4)
                                                    .PaddingVertical(10)  // Más espacio para subtítulos
                                                    .Element(SubtituloStyleSinBordes)
                                                    .Text(subtitulo)
                                                    .Bold()
                                                    .FontSize(12);
                                                currentSubtitulo = subtitulo;
                                            }

                                            // Aplicar el estilo con más espacio vertical
                                            resultsTable.Cell().Element(CeldaAltaStyle).Text(resultado.NombreParametro ?? "").FontSize(12);
                                            resultsTable.Cell().Element(CeldaAltaStyle).Text(resultado.Resultado ?? "").FontSize(12);
                                            resultsTable.Cell().Element(CeldaAltaStyle).Text(resultado.IdparametroNavigation?.UnidadMedida ?? "").FontSize(12);
                                            resultsTable.Cell().Element(CeldaAltaStyle).Text(resultado.IdparametroNavigation?.ValorReferencia ?? "").FontSize(12);
                                        }
                                    });
                                }
                            }
                            else if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("COAGULACIÓN"))
                            {
                                var listaResultados = resultadosFiltrados.ToList();
                                var resultadosPorPagina = new List<List<ResultadoExaman>>();
                                int resultadosPorPaginaCount = 15;

                                for (int i = 0; i < listaResultados.Count; i += resultadosPorPaginaCount)
                                {
                                    resultadosPorPagina.Add(listaResultados
                                        .Skip(i)
                                        .Take(resultadosPorPaginaCount)
                                        .ToList());
                                }

                                for (int i = 0; i < resultadosPorPagina.Count; i++)
                                {
                                    var resultadosPagina = resultadosPorPagina[i];

                                    if (i == 0)
                                    {
                                        column.Item().Table(headerTable =>
                                        {
                                            headerTable.ColumnsDefinition(columns =>
                                            {
                                                columns.RelativeColumn(3);     // ANÁLISIS
                                                columns.RelativeColumn(1.8f);  // RESULTADO
                                                columns.RelativeColumn(2.4f);  // VALORES DE REFERENCIA
                                            });

                                            headerTable.Header(header =>
                                            {
                                                header.Cell().Element(CellStyle).AlignLeft().Text("      ANÁLISIS").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                header.Cell().Element(CellStyle).AlignLeft().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                header.Cell().Element(CellStyle).AlignLeft().Text("VALORES DE REFERENCIA").Bold().FontColor(Colors.White).FontSize(12.5f);
                                            });

                                            if (!string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                            {
                                                headerTable.Cell().ColumnSpan(3)
                                                    .PaddingVertical(2)
                                                    .Element(DescripcionStyle)
                                                    .Text(detalleOrden.IdtipoExamenNavigation.Descripcion)
                                                    .Bold()
                                                    .FontSize(12);
                                            }
                                        });
                                    }

                                    column.Item().Table(resultsTable =>
                                    {
                                        resultsTable.ColumnsDefinition(columns =>
                                        {
                                            columns.RelativeColumn(3);
                                            columns.RelativeColumn(1.8f);
                                            columns.RelativeColumn(2.4f);
                                        });

                                        string currentSubtitulo = null;
                                        foreach (var resultado in resultadosPagina)
                                        {
                                            var subtitulo = resultado.IdparametroNavigation?.Subtitulo;
                                            if (subtitulo != currentSubtitulo && !string.IsNullOrEmpty(subtitulo))
                                            {
                                                resultsTable.Cell().ColumnSpan(3)
                                                    .PaddingVertical(2)
                                                    .Element(SubtituloStyle)
                                                    .Text(subtitulo)
                                                    .Bold()
                                                    .FontSize(12);
                                                currentSubtitulo = subtitulo;
                                            }

                                            var nombreParametro = resultado.NombreParametro ?? "";
                                            var valorResultado = resultado.Resultado ?? "";
                                            var valorReferencia = resultado.IdparametroNavigation?.ValorReferencia ?? "";

                                            // Nombre del parámetro
                                            resultsTable.Cell().Element(ResultadoStyle).Text(nombreParametro).FontSize(12);

                                            // Resultado centrado
                                            resultsTable.Cell().Element(ResultadoStyle).Text(valorResultado).FontSize(12);

                                            // Valor de referencia
                                            resultsTable.Cell().Element(ResultadoStyle).Text(valorReferencia).FontSize(12);
                                        }
                                    });
                                }
                            }
                            else if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("UROCULTIVO"))
                            {
                                // Verificar si es un urocultivo negativo:
                                // 1. Si hay un parámetro llamado "OBSERVACION" o "NOTA"
                                // 2. O si todos los parámetros están vacíos (excepto posibles notas)
                                bool esUrocultivoNegativo = resultadosFiltrados.Any(r =>
                                    r.NombreParametro != null &&
                                    (r.NombreParametro.Equals("OBSERVACION", StringComparison.OrdinalIgnoreCase) ||
                                     r.NombreParametro.Equals("NOTA", StringComparison.OrdinalIgnoreCase))) ||
                                   !resultadosFiltrados.Any(r =>
                                       !string.IsNullOrWhiteSpace(r.Resultado) &&
                                       r.NombreParametro != null &&
                                       !r.NombreParametro.Equals("OBSERVACION", StringComparison.OrdinalIgnoreCase) &&
                                       !r.NombreParametro.Equals("NOTA", StringComparison.OrdinalIgnoreCase));

                                if (esUrocultivoNegativo)
                                {
                                    // Mostrar formato de UROCULTIVO NEGATIVO
                                    column.Item().PaddingTop(15).AlignCenter().Column(centeredColumn =>
                                    {
                                        centeredColumn.Item().PaddingBottom(10).Text(text =>
                                        {
                                            text.Span("RESULTADO").Bold().FontSize(12);
                                        });

                                        centeredColumn.Item().PaddingBottom(20).AlignCenter().Text(text =>
                                        {
                                            text.Span("NO HUBO CRECIMIENTO BACTERIANO EN 48 HORAS DE INCUBACIÓN.").FontSize(12);
                                        });

                                        // Mostrar la NOTA personalizada si existe y no es solo un punto
                                        if (notaParametro != null && !string.IsNullOrWhiteSpace(notaParametro.Resultado))
                                        {
                                            string nota = notaParametro.Resultado.Trim();
                                            if (nota != ".")
                                            {
                                                centeredColumn.Item().PaddingBottom(10).Text(text =>
                                                {
                                                    text.Span("NOTA: ").Bold().FontSize(12);
                                                    text.Span(notaParametro.Resultado).FontSize(12);
                                                });
                                            }
                                        }

                                        // Agregar la nota estática
                                        centeredColumn.Item().PaddingTop(20).Text(text =>
                                        {
                                            text.Span("NOTA: ").Bold().FontSize(12);
                                            text.Span("Para un cultivo de orina apropiado, es esencial la recolección adecuada de la muestra y evitar la ingesta de antibiótico, ya que afecta directamente el resultado del urocultivo.").FontSize(14);
                                        });
                                    });
                                }
                                else
                                {
                                    // Mostrar formato de UROCULTIVO normal
                                    // Separar los 3 primeros parámetros (MICROORGANISMO AISLADO, CONTALE DE COLONIAS, BLEE)
                                    var parametrosEspeciales = resultadosFiltrados
                                        .Where(r => r.NombreParametro != null &&
                                               (r.NombreParametro.ToUpper().Contains("MICROORGANISMO AISLADO") ||
                                                r.NombreParametro.ToUpper().Contains("CONTAJE DE COLONIAS") ||
                                                r.NombreParametro.ToUpper().Contains("BLEE")))
                                        .OrderBy(r => r.Idparametro)
                                        .ToList();

                                    // Los demás parámetros van en la tabla de antibióticos
                                    var parametrosTabla = resultadosFiltrados
                                        .Where(r => !parametrosEspeciales.Contains(r))
                                        .ToList();

                                    // Mostrar los 3 parámetros especiales en una tabla con bordes
                                    column.Item().PaddingTop(10).Table(specialTable =>
                                    {
                                        specialTable.ColumnsDefinition(columns =>
                                        {
                                            columns.RelativeColumn(3); // Nombre del parámetro
                                            columns.RelativeColumn(2); // Resultado
                                        });


                                        foreach (var parametro in parametrosEspeciales)
                                        {
                                            specialTable.Cell().Element(CellContentStyle).Text(text =>
                                            {
                                                text.Span($"{parametro.NombreParametro?.ToUpper()}").Bold().FontSize(12);
                                            });

                                            // Formatear el resultado si es el parámetro "CONTAJE DE COLONIAS"
                                            string resultadoFormateado = parametro.Resultado ?? "";
                                            if (parametro.NombreParametro != null &&
                                                parametro.NombreParametro.ToUpper().Contains("CONTAJE DE COLONIAS") &&
                                                !string.IsNullOrWhiteSpace(resultadoFormateado))
                                            {
                                                // Reemplazar puntos por comas en los valores numéricos
                                                resultadoFormateado = resultadoFormateado
                                                    .Replace("20.000", "20,000")
                                                    .Replace("30.000", "30,000")
                                                    .Replace("50.000", "50,000")
                                                    .Replace("80.000", "80,000")
                                                    .Replace(">100.000", ">100,000");
                                            }

                                            specialTable.Cell().Element(CellContentStyle).Text(resultadoFormateado).FontSize(12);
                                        }
                                    });

                                    // Mostrar la descripción del examen si existe
                                    if (!string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                    {
                                        column.Item().PaddingTop(15).AlignCenter().Text(detalleOrden.IdtipoExamenNavigation.Descripcion).Bold().FontSize(12);
                                        column.Item().PaddingBottom(10); // Espacio adicional después de la descripción
                                    }

                                    // Mostrar la tabla de antibióticos
                                    column.Item().Table(table =>
                                    {
                                        table.ColumnsDefinition(columns =>
                                        {
                                            columns.RelativeColumn(3); // Antibiótico
                                            columns.RelativeColumn(2); // Resultado
                                        });

                                        // Encabezado de la tabla
                                        table.Header(header =>
                                        {
                                            header.Cell().Element(CellStyle).AlignLeft().Text("     Antibióticos").Bold().FontColor(Colors.White).FontSize(12.5f);
                                            header.Cell().Element(CellStyle).AlignLeft().Text("Resultados").Bold().FontColor(Colors.White).FontSize(12.5f);
                                        });

                                        // Filas de datos
                                        foreach (var resultado in parametrosTabla)
                                        {
                                            table.Cell().Element(ResultadoStyle).Text(resultado.NombreParametro ?? "").FontSize(12);
                                            table.Cell().Element(ResultadoStyle).Text(resultado.Resultado ?? "").FontSize(12);
                                        }
                                    });

                                    // NOTA INDEPENDIENTE PARA UROCULTIVO NORMAL
                                    column.Item().PaddingTop(20).Column(notaColumn =>
                                    {
                                        // Mostrar la NOTA personalizada si existe
                                        if (notaParametro != null && !string.IsNullOrWhiteSpace(notaParametro.Resultado))
                                        {
                                            notaColumn.Item().Text(text =>
                                            {
                                                text.Span("NOTA: ").Bold().FontSize(12);
                                                text.Span(notaParametro.Resultado).FontSize(12);
                                            });
                                        }
                                    });
                                }
                            }
                            // TABLA ESTÁNDAR
                            else
                            {
                                var listaResultados = resultadosFiltrados.ToList();
                                var resultadosPorPagina = new List<List<ResultadoExaman>>();
                                int resultadosPorPaginaCount = 15;

                                // Variable para rastrear si ya mostramos un subtítulo en páginas anteriores
                                string lastShownSubtitulo = null;

                                for (int i = 0; i < listaResultados.Count; i += resultadosPorPaginaCount)
                                {
                                    resultadosPorPagina.Add(listaResultados
                                        .Skip(i)
                                        .Take(resultadosPorPaginaCount)
                                        .ToList());
                                }

                                for (int i = 0; i < resultadosPorPagina.Count; i++)
                                {
                                    var resultadosPagina = resultadosPorPagina[i];

                                    if (i == 0)
                                    {
                                        column.Item().Table(headerTable =>
                                        {
                                            headerTable.ColumnsDefinition(columns =>
                                            {
                                                columns.RelativeColumn(3);
                                                columns.RelativeColumn(1.3f);
                                                columns.RelativeColumn(1);
                                                columns.RelativeColumn(2.5f);
                                            });

                                            headerTable.Header(header =>
                                            {
                                                header.Cell().Element(CellStyle).AlignLeft().Text("      ANÁLISIS").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                header.Cell().Element(CellStyle).AlignLeft().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                header.Cell().Element(CellStyle).Text("").Bold().FontColor(Colors.White);
                                                header.Cell().Element(CellStyle).AlignLeft().Text("VALORES DE REFERENCIA").Bold().FontColor(Colors.White).FontSize(12.5f);
                                            });

                                            if (!string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                            {
                                                headerTable.Cell().ColumnSpan(4)
                                                    .PaddingVertical(2)
                                                    .Element(DescripcionStyle)
                                                    .Text(detalleOrden.IdtipoExamenNavigation.Descripcion)
                                                    .Bold()
                                                    .FontSize(12);
                                            }
                                        });
                                    }

                                    column.Item().Table(resultsTable =>
                                    {
                                        resultsTable.ColumnsDefinition(columns =>
                                        {
                                            columns.RelativeColumn(3);
                                            columns.RelativeColumn(1.3f);
                                            columns.RelativeColumn(1);
                                            columns.RelativeColumn(2.5f);
                                        });

                                        string currentSubtitulo = null;
                                        foreach (var resultado in resultadosPagina)
                                        {
                                            var subtitulo = resultado.IdparametroNavigation?.Subtitulo;

                                            // Solo mostrar el subtítulo si es diferente al actual Y no ha sido mostrado antes
                                            if (subtitulo != currentSubtitulo && !string.IsNullOrEmpty(subtitulo) &&
                                                (lastShownSubtitulo == null || !subtitulo.Equals(lastShownSubtitulo)))
                                            {
                                                resultsTable.Cell().ColumnSpan(4)
                                                    .PaddingVertical(2)
                                                    .Element(SubtituloStyle)
                                                    .Text(subtitulo)
                                                    .Bold()
                                                    .FontSize(12);
                                                currentSubtitulo = subtitulo;
                                                lastShownSubtitulo = subtitulo;
                                            }

                                            // Verificar si es el parámetro "Cristales" o "Cilindros"
                                            bool esCristales = resultado.NombreParametro?.Contains("Cristales", StringComparison.OrdinalIgnoreCase) ?? false;
                                            bool esCilindros = resultado.NombreParametro?.Contains("Cilindros", StringComparison.OrdinalIgnoreCase) ?? false;
                                            bool esColor = resultado.NombreParametro?.Contains("Color", StringComparison.OrdinalIgnoreCase) ?? false;

                                            if (esCristales || esCilindros || esColor)
                                            {
                                                // Para Cristales o Cilindros: ocupar toda la línea
                                                resultsTable.Cell().Element(ResultadoStyle).Text(resultado.NombreParametro ?? "").FontSize(12);
                                                resultsTable.Cell().ColumnSpan(3).Element(ResultadoStyle).Text(resultado.Resultado ?? "").FontSize(12);
                                            }
                                            else
                                            {
                                                // Para otros parámetros: formato normal
                                                resultsTable.Cell().Element(ResultadoStyle).Text(resultado.NombreParametro ?? "").FontSize(12);
                                                resultsTable.Cell().Element(ResultadoStyle).Text(resultado.Resultado ?? "").FontSize(12);
                                                resultsTable.Cell().Element(ResultadoStyle).Text(resultado.IdparametroNavigation?.UnidadMedida ?? "").FontSize(12);
                                                resultsTable.Cell().Element(ResultadoStyle).Text(resultado.IdparametroNavigation?.ValorReferencia ?? "").FontSize(12);
                                            }
                                        }
                                    });
                                }
                            }

                            // Mostrar la NOTA si existe y solo para los exámenes específicos
                            if (notaParametro != null && !string.IsNullOrWhiteSpace(notaParametro.Resultado))
                            {
                                var nombreExamen = detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper();

                                // Excluir UROCULTIVO completamente
                                bool esUrocultivo = nombreExamen.Contains("UROCULTIVO");

                                if (!esUrocultivo &&
                                    (nombreExamen.Contains("HEMATOLOGÍA") ||
                                     nombreExamen.Contains("QUÍMICA SANGUÍNEA") ||
                                     // Para la tabla estándar, verifica que no sea ninguno de los otros formatos especiales
                                     (!nombreExamen.Contains("EXÁMENES DIVERSOS") &&
                                      !nombreExamen.Contains("PARASITOLOGÍA") &&
                                      !nombreExamen.Contains("SEROLOGÍA") &&
                                      !nombreExamen.Contains("CITOLOGÍA FECAL") &&
                                      !nombreExamen.Contains("COAGULACIÓN"))))
                                {
                                    column.Item().PaddingTop(10).Text(text =>
                                    {
                                        text.Span("NOTA: ").Bold();
                                        text.Span(notaParametro.Resultado);
                                    });
                                }
                            }

                        });
                    });
                });

                // Estilos
                static IContainer CellStyle(IContainer container)
                {
                    return container
                        .BorderBottom(1)
                        .Background("#0E5460")
                        .BorderColor(Colors.Black)
                        .PaddingVertical(1);
                }

                static IContainer DescripcionStyle(IContainer container)
                {
                    return container
                        .BorderBottom(1)
                        .BorderColor(Colors.Grey.Lighten2)
                        .PaddingVertical(0.5f)
                        .PaddingHorizontal(5);
                }

                static IContainer SubtituloStyle(IContainer container)
                {
                    return container
                        .BorderBottom(1)
                        .BorderColor(Colors.Grey.Lighten2)
                        .PaddingVertical(0.5f)
                        .PaddingHorizontal(5);
                }

                static IContainer ResultadoStyle(IContainer container)
                {
                    return container
                        .BorderBottom(1)
                        .BorderColor(Colors.Grey.Lighten2)
                        .PaddingVertical(0.5f)
                        .PaddingHorizontal(5);
                }

                static IContainer CellContentStyle(IContainer container)
                {
                    return container
                        .BorderBottom(1)
                        .BorderColor(Colors.Grey.Lighten2)
                        .PaddingVertical(0.5f)
                        .PaddingHorizontal(5);
                }
                static IContainer DescripcionStyleSinBordes(IContainer container)
                {
                    return container
                        .PaddingVertical(0.5f)
                        .PaddingHorizontal(5);
                }

                static IContainer SubtituloStyleSinBordes(IContainer container)
                {
                    return container
                        .PaddingVertical(0.5f)
                        .PaddingHorizontal(5);
                }

                static IContainer ResultadoStyleSinBordes(IContainer container)
                {
                    return container
                        .PaddingVertical(0.5f)
                        .PaddingHorizontal(5);
                }

                var pdfBytes = document.GeneratePdf();
                var nombreArchivo = $"Reporte_{detalleOrden.IdtipoExamenNavigation.NombreExamen.Replace(" ", "_")}_{detalleOrden.IdordenNavigation.IdclienteNavigation.Nombre?.Replace(" ", "_")}_{DateTime.Now:yyyyMMdd}.pdf";

                return File(pdfBytes, "application/pdf", nombreArchivo);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al generar el reporte: {ex.Message}");
            }
        }


        [HttpGet("generar-reporte-completo/{idCliente}")]
        public async Task<IActionResult> GenerarReporteCompletoPaciente(int idCliente)
        {
            try
            {
                var exePath = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
                var imagePath = Path.Combine(exePath, "img", "logo.jpeg");
                byte[] imageBytes = System.IO.File.ReadAllBytes(imagePath);

                // Obtener todas las órdenes completas del paciente con sus exámenes (ordenadas por fecha descendente)
                var ordenes = await _context.Ordens
                    .Include(o => o.IdclienteNavigation)
                    .Include(o => o.IdmedicoNavigation)
                    .Include(o => o.DetalleOrdens)
                        .ThenInclude(d => d.IdtipoExamenNavigation)
                    .Include(o => o.DetalleOrdens)
                        .ThenInclude(d => d.ResultadoExamen)
                            .ThenInclude(r => r.IdparametroNavigation)
                    .Where(o => o.Idcliente == idCliente && o.Estado == "COMPLETADO")
                    .OrderByDescending(o => o.FechaOrden)
                    .ToListAsync();

                if (ordenes == null || !ordenes.Any())
                    return NotFound("No se encontraron exámenes con resultados para este paciente");

                // Obtener datos del cliente
                var paciente = ordenes.First().IdclienteNavigation;
                var edad = paciente.FechaNacimiento.HasValue ?
                    DateTime.Now.Year - paciente.FechaNacimiento.Value.Year : 0;

                // Generar PDF
                var document = Document.Create(container =>
                {
                    // Estilos reutilizables
                    Func<IContainer, IContainer> CellStyle = cell => cell
                        .BorderBottom(1)
                        .Background("#0E5460")
                        .BorderColor(Colors.Black)
                        .PaddingVertical(1);

                    Func<IContainer, IContainer> DescripcionStyle = desc => desc
                        .BorderBottom(1)
                        .BorderColor(Colors.Grey.Lighten2)
                        .PaddingHorizontal(5);

                    Func<IContainer, IContainer> SubtituloStyle = sub => sub
                        .BorderBottom(1)
                        .BorderColor(Colors.Grey.Lighten2)
                        .PaddingHorizontal(5);

                    Func<IContainer, IContainer> ResultadoStyle = res => res
                        .BorderBottom(1)
                        .BorderColor(Colors.Grey.Lighten2)
                        .PaddingVertical(0.5f)
                        .PaddingHorizontal(5);

                    Func<IContainer, IContainer> CellContentStyle = cell => cell
                        .BorderBottom(1)
                        .BorderColor(Colors.Grey.Lighten2)
                        .PaddingVertical(0.5f)
                        .PaddingHorizontal(5);
                    static IContainer DescripcionStyleSinBordes(IContainer container)
                    {
                        return container
                            .PaddingVertical(0.5f)
                            .PaddingHorizontal(5);
                    }

                    static IContainer SubtituloStyleSinBordes(IContainer container)
                    {
                        return container
                            .PaddingVertical(0.5f)
                            .PaddingHorizontal(5);
                    }

                    static IContainer ResultadoStyleSinBordes(IContainer container)
                    {
                        return container
                            .PaddingVertical(0.5f)
                            .PaddingHorizontal(5);
                    }


                    // Configuración de página
                    container.Page(page =>
                    {
                        page.Size(PageSizes.A4);
                        page.Margin(30);
                        page.DefaultTextStyle(x => x.FontSize(10).FontFamily("Times New Roman"));

                        // Encabezado
                        page.Header().Column(column =>
                        {
                            column.Item().Row(row =>
                            {
                                row.RelativeItem(1).AlignLeft().Image(imageBytes, ImageScaling.FitWidth);
                                row.RelativeItem(3).Column(textColumn =>
                                {
                                    textColumn.Item().AlignCenter().Text("Laboratorio Clínico").Bold().Italic().FontSize(20).FontColor("#1F3864");
                                    textColumn.Item().AlignCenter().Text("Sangre de Cristo").Bold().Italic().FontSize(20).FontColor("#1F3864");
                                    textColumn.Item().AlignCenter().Text("Lic. Miurell Gutiérrez Rivera").Italic().FontSize(12).FontColor("#1F3864");
                                    textColumn.Item().AlignCenter().Text("Lic. Alvaro Bracamonte Nicaragua").Italic().FontSize(12).FontColor("#1F3864");
                                });
                                row.RelativeItem(1);
                            });

                            column.Item().PaddingTop(5).LineHorizontal(1).LineColor(Colors.Grey.Medium);
                            column.Item().PaddingVertical(10);
                        });

                        // Pie de página
                        page.Footer().Column(column =>
                        {
                            column.Item().AlignRight().PaddingBottom(5).Text("________________________").FontSize(10);
                            column.Item().PaddingBottom(25);
                            column.Item().PaddingTop(10).AlignCenter().Text("Tu confianza, es nuestra satisfacción").Bold().Italic().FontColor("#1F3864");
                            column.Item().PaddingBottom(20);
                            column.Item().AlignCenter().Text("Dirección: Casa natal de Rubén Darío 4 Cuadras al este, Ciudad Darío, Matagalpa.").Italic();
                            column.Item().AlignCenter().Text("Cel: 85052997").Italic();
                            column.Item().AlignCenter().Text("Correo electrónico: Labsandecris@gmail.com").Italic();
                        });

                        // Contenido
                        page.Content().Column(column =>
                        {
                            bool datosPacienteMostradosEnPagina = false;
                            (int columns, List<string> headers)? tablaAnterior = null;
                            int? ordenActual = null;
                            bool esPrimerExamenEnPagina = true;

                            foreach (var orden in ordenes)
                            {
                                var examenesEnOrden = orden.DetalleOrdens
                                    .Where(d => d.ResultadoExamen.Any(r => !string.IsNullOrWhiteSpace(r.Resultado)))
                                    .OrderBy(d => d.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("EXÁMENES DIVERSOS") ? 1 : 0)
                                    .ThenBy(d => d.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("COAGULACIÓN") ? 1 : 0)
                                    .ThenBy(d => EsExamenPequeno(d) ? 1 : 0) // Luego pequeños
                                    .ThenBy(d => d.IddetalleOrden)
                                    .ToList();

                                if (!examenesEnOrden.Any())
                                    continue;

                                // Función para determinar si un examen es pequeño (8 o menos parámetros)
                                bool EsExamenPequeno(DetalleOrden detalle)
                                {
                                    return detalle.ResultadoExamen.Count(r => !string.IsNullOrWhiteSpace(r.Resultado)) <= 8;
                                }

                                // Calcular altura total de los exámenes en esta orden
                                int alturaTotal = examenesEnOrden.Sum(e => e.ResultadoExamen.Count(r => !string.IsNullOrWhiteSpace(r.Resultado)));
                                bool puedenCaberEnUnaPagina = alturaTotal <= 25 && examenesEnOrden.Count > 1;

                                // Procesar cada examen en la orden
                                for (int i = 0; i < examenesEnOrden.Count; i++)
                                {
                                    var detalleOrden = examenesEnOrden[i];
                                    bool esPrimerExamenEnOrden = i == 0;
                                    bool esUltimoExamenEnOrden = i == examenesEnOrden.Count - 1;
                                    bool examenActualEsPequeno = EsExamenPequeno(detalleOrden);
                                    bool proximoExamenEsPequeno = !esUltimoExamenEnOrden && EsExamenPequeno(examenesEnOrden[i + 1]);

                                    // Determinar si podemos agrupar exámenes pequeños
                                    bool agruparConSiguiente = examenActualEsPequeno && proximoExamenEsPequeno;

                                    var (currentColumns, currentHeaders) = DeterminarTipoTabla(
                                        detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper(),
                                        esPrimerExamenEnOrden,
                                        puedenCaberEnUnaPagina,
                                        esPrimerExamenEnPagina);

                                    bool esMismaTabla = tablaAnterior.HasValue &&
                                                        currentColumns == tablaAnterior.Value.columns &&
                                                        currentHeaders.SequenceEqual(tablaAnterior.Value.headers);

                                    // Mostrar datos del paciente solo si es necesario
                                    if (orden.Idorden != ordenActual || !datosPacienteMostradosEnPagina)
                                    {
                                        column.Item().Row(row =>
                                        {
                                            row.RelativeItem().Text(text =>
                                            {
                                                text.Span("Paciente: ").Bold().FontSize(12.5f);
                                                text.Span($"{paciente.Nombre ?? "N/A"}").FontSize(12.5f);
                                            });

                                            row.RelativeItem().AlignRight().Text(text =>
                                            {
                                                text.Span("Sexo - Edad: ").Bold().FontSize(12.5f);
                                                text.Span($"{FormatearGenero(paciente.Genero)} - {edad} Años").FontSize(12.5F);
                                            });
                                        });

                                        column.Item().Row(row =>
                                        {
                                            row.RelativeItem().Text(text =>
                                            {
                                                text.Span("Médico: ").Bold().FontSize(12.5f);
                                                text.Span(orden.IdmedicoNavigation?.Nombre ?? "N/A").FontSize(12.5f);
                                            });

                                            row.RelativeItem().AlignRight().Text(text =>
                                            {
                                                text.Span("Núm. Muestra: ").Bold().FontSize(12.5F);
                                                text.Span(orden.NumeroMuestra.ToString()).FontSize(12.5F);
                                            });
                                        });

                                        column.Item().Row(row =>
                                        {
                                            row.RelativeItem().Text(text =>
                                            {
                                                text.Span("Mx Recepcionado: ").Bold().FontSize(12.5f);
                                                text.Span(orden.FechaOrden?.ToString("dd/MM/yyyy")).FontSize(12.5f);
                                            });

                                            row.RelativeItem().AlignRight().Text(text =>
                                            {
                                                text.Span("Emisión de resultado: ").Bold().FontSize(12.5f);
                                                text.Span(orden.FechaEntrega?.ToString("dd/MM/yyyy") ?? "N/A").FontSize(12.5f);
                                            });
                                        });

                                        datosPacienteMostradosEnPagina = true;
                                        ordenActual = orden.Idorden;
                                    }

                                    // Título del examen
                                    var tituloExamen = detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("CITOLOGÍA FECAL") ||
                                                       detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("TINCION WRIGTH")
                                        ? "PARASITOLOGÍA"
                                        : detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper();


                                    column.Item().PaddingTop(esPrimerExamenEnPagina ? 15 : 15).AlignCenter()
                                        .Text(tituloExamen)
                                        .Bold().FontSize(14);
                                    column.Item().PaddingBottom(20);

                                    var resultadosFiltrados = detalleOrden.ResultadoExamen
                                        .Where(r => !string.IsNullOrWhiteSpace(r.Resultado))
                                        .OrderBy(r => string.IsNullOrEmpty(r.IdparametroNavigation?.Subtitulo) ? 0 : 1)
                                        .ThenBy(r => r.Idparametro)
                                        .ThenBy(r => r.IdparametroNavigation?.Subtitulo)
                                        .ToList();

                                    // Detectar y filtrar parámetro NOTA
                                    var notaParametro = resultadosFiltrados.FirstOrDefault(r =>
                                        r.NombreParametro != null &&
                                        r.NombreParametro.Equals("NOTA", StringComparison.OrdinalIgnoreCase));

                                    // Filtrar el parámetro NOTA de los resultados que van en la tabla
                                    resultadosFiltrados = resultadosFiltrados
                                        .Where(r => r.NombreParametro == null ||
                                               !r.NombreParametro.Equals("NOTA", StringComparison.OrdinalIgnoreCase))
                                        .ToList();

                                    // EXÁMENES DIVERSOS
                                    if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("EXÁMENES DIVERSOS"))
                                    {
                                        var listaResultados = resultadosFiltrados.ToList();
                                        var resultadosPorPagina = new List<List<ResultadoExaman>>();
                                        int resultadosPorPaginaCount = 15;

                                        // Primero separamos los datos en las 3 categorías
                                        var muestras = listaResultados
                                            .Where(r => r.NombreParametro != null && r.NombreParametro.ToUpper().Contains("MUESTRA"))
                                            .OrderBy(r => r.Idparametro)
                                            .ToList();

                                        var examenes = listaResultados
                                            .Where(r => r.NombreParametro != null &&
                                                   !r.NombreParametro.ToUpper().Contains("MUESTRA") &&
                                                   !r.NombreParametro.ToUpper().Contains("RESULTADO") &&
                                                   !r.NombreParametro.ToUpper().Contains("DIAGNÓSTICO"))
                                            .OrderBy(r => r.Idparametro)
                                            .ToList();

                                        var resultados = listaResultados
                                            .Where(r => r.NombreParametro != null &&
                                                   (r.NombreParametro.ToUpper().Contains("RESULTADO") ||
                                                    r.NombreParametro.ToUpper().Contains("DIAGNÓSTICO")))
                                            .OrderBy(r => r.Idparametro)
                                            .ToList();

                                        // Creamos una lista combinada ordenada
                                        var listaCombinada = new List<ResultadoExaman>();
                                        int maxCount = new[] { muestras.Count, examenes.Count, resultados.Count }.Max();

                                        for (int j = 0; j < maxCount; j++)
                                        {
                                            if (j < muestras.Count) listaCombinada.Add(muestras[j]);
                                            if (j < examenes.Count) listaCombinada.Add(examenes[j]);
                                            if (j < resultados.Count) listaCombinada.Add(resultados[j]);
                                        }

                                        // Paginamos la lista combinada
                                        for (int j = 0; j < listaCombinada.Count; j += resultadosPorPaginaCount)
                                        {
                                            resultadosPorPagina.Add(listaCombinada
                                                .Skip(j)
                                                .Take(resultadosPorPaginaCount)
                                                .ToList());
                                        }

                                        for (int j = 0; j < resultadosPorPagina.Count; j++)
                                        {
                                            var resultadosPagina = resultadosPorPagina[j];

                                            column.Item().Table(diversosTable =>
                                            {
                                                diversosTable.ColumnsDefinition(columns =>
                                                {
                                                    columns.RelativeColumn(3);
                                                    columns.RelativeColumn(4);
                                                    columns.RelativeColumn(3);
                                                });

                                                if (j == 0)
                                                {
                                                    diversosTable.Header(header =>
                                                    {
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("     MUESTRA").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                        header.Cell().Element(CellStyle).AlignCenter().Text("EXAMEN").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                        header.Cell().Element(CellStyle).AlignCenter().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                    });
                                                }

                                                // Procesamos en grupos de 3 (muestra, examen, resultado)
                                                for (int k = 0; k < resultadosPagina.Count; k += 3)
                                                {
                                                    var muestra = resultadosPagina[k];
                                                    var examen = k + 1 < resultadosPagina.Count ? resultadosPagina[k + 1] : null;
                                                    var resultado = k + 2 < resultadosPagina.Count ? resultadosPagina[k + 2] : null;

                                                    // Verificamos los tipos para asegurarnos de que están en la columna correcta
                                                    if (muestra != null && !muestra.NombreParametro.ToUpper().Contains("MUESTRA"))
                                                    {
                                                        // Si no es muestra, rotamos los valores
                                                        var temp = muestra;
                                                        muestra = examen;
                                                        examen = resultado;
                                                        resultado = temp;
                                                    }

                                                    diversosTable.Cell().Element(CellContentStyle).PaddingHorizontal(12).AlignLeft()
                                                        .Text(muestra?.Resultado ?? "").FontSize(12);
                                                    diversosTable.Cell().Element(CellContentStyle).AlignCenter()
                                                        .Text(examen?.NombreParametro ?? examen?.Resultado ?? "").FontSize(12);
                                                    diversosTable.Cell().Element(CellContentStyle).AlignCenter()
                                                        .Text(resultado?.Resultado ?? "").FontSize(12);
                                                }
                                            });
                                        }
                                    }
                                    else if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("PARASITOLOGÍA"))
                                    {
                                        // Primero mostramos la tabla estándar para otros parámetros
                                        var parametrosNormales = resultadosFiltrados
                                            .Where(r => r.NombreParametro != null &&
                                                   !r.NombreParametro.ToUpper().Contains("MUESTRA") &&
                                                   !r.NombreParametro.ToUpper().Contains("EXAMEN") &&
                                                   !r.NombreParametro.ToUpper().Contains("RESULTADO") &&
                                                   !r.NombreParametro.ToUpper().Contains("HELICOBACTER PYLORI") &&
                                                   !r.NombreParametro.ToUpper().Contains("SANGRE OCULTA (FOB)"))
                                            .ToList();

                                        if (parametrosNormales.Any())
                                        {
                                            column.Item().Table(table =>
                                            {
                                                table.ColumnsDefinition(columns =>
                                                {
                                                    columns.RelativeColumn(2.5f); // Parámetro
                                                    columns.RelativeColumn(4); // Resultado
                                                });

                                                // Solo mostrar encabezado si es el primer examen en la orden
                                                if (!esMismaTabla && (esPrimerExamenEnOrden || esPrimerExamenEnPagina))
                                                {
                                                    table.Header(header =>
                                                    {
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("      ANÁLISIS").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                    });
                                                }

                                                // Agregar descripción si existe
                                                if (!string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                                {
                                                    table.Cell().ColumnSpan(2)
                                                        .PaddingVertical(2)
                                                        .Element(DescripcionStyle)
                                                        .Text(detalleOrden.IdtipoExamenNavigation.Descripcion)
                                                        .Bold()
                                                        .FontSize(12);
                                                }

                                                string currentSubtitulo = null;
                                                foreach (var resultado in parametrosNormales)
                                                {
                                                    var subtitulo = resultado.IdparametroNavigation?.Subtitulo;
                                                    if (subtitulo != currentSubtitulo && !string.IsNullOrEmpty(subtitulo))
                                                    {
                                                        table.Cell().ColumnSpan(2)
                                                            .PaddingVertical(2)
                                                            .Element(SubtituloStyle)
                                                            .Text(subtitulo)
                                                            .Bold()
                                                            .FontSize(12);
                                                        currentSubtitulo = subtitulo;
                                                    }

                                                    table.Cell().Element(ResultadoStyle).Text(resultado.NombreParametro ?? "").FontSize(12);
                                                    table.Cell().Element(ResultadoStyle).Text(resultado.Resultado ?? "").FontSize(12);
                                                }
                                            });
                                        }

                                        // Tabla especial MUESTRA/EXAMEN/RESULTADO para Parasitología
                                        var muestras = resultadosFiltrados
                                            .Where(r => r.NombreParametro != null && r.NombreParametro.ToUpper().Contains("MUESTRA"))
                                            .OrderBy(r => r.NombreParametro)
                                            .ToList();

                                        var examenesEspeciales = resultadosFiltrados
                                            .Where(r => r.NombreParametro != null &&
                                                   (r.NombreParametro.ToUpper().Contains("HELICOBACTER PYLORI") ||
                                                    r.NombreParametro.ToUpper().Contains("SANGRE OCULTA (FOB)")))
                                            .OrderBy(r => r.NombreParametro)
                                            .ToList();

                                        var resultadosEspeciales = resultadosFiltrados
                                            .Where(r => r.NombreParametro != null && r.NombreParametro.ToUpper().Contains("RESULTADO"))
                                            .OrderBy(r => r.NombreParametro)
                                            .ToList();

                                        // Mostrar tabla especial si tenemos al menos un conjunto completo
                                        if (muestras.Any() && examenesEspeciales.Any() && resultadosEspeciales.Any())
                                        {
                                            column.Item().PaddingTop(10).Table(parasitologiaTable =>
                                            {
                                                parasitologiaTable.ColumnsDefinition(columns =>
                                                {
                                                    columns.RelativeColumn(2);
                                                    columns.RelativeColumn(3);
                                                    columns.RelativeColumn(2);
                                                });

                                                // Solo mostrar encabezado si es el primer examen en la orden
                                                if (!esMismaTabla && (esPrimerExamenEnOrden || esPrimerExamenEnPagina))
                                                {
                                                    parasitologiaTable.Header(header =>
                                                    {
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("     MUESTRA").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                        header.Cell().Element(CellStyle).AlignCenter().Text("EXAMEN").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                        header.Cell().Element(CellStyle).AlignCenter().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                    });
                                                }

                                                // Determinamos el número máximo de filas a mostrar
                                                int maxRows = Math.Min(muestras.Count, Math.Min(examenesEspeciales.Count, resultadosEspeciales.Count));

                                                for (int i = 0; i < maxRows; i++)
                                                {
                                                    var muestra = muestras[i];
                                                    var examen = examenesEspeciales[i];
                                                    var resultado = resultadosEspeciales[i];

                                                    parasitologiaTable.Cell().Element(ResultadoStyle).PaddingHorizontal(12).Text(muestra.Resultado ?? "").FontSize(12);
                                                    parasitologiaTable.Cell().Element(ResultadoStyle).AlignCenter().Text(examen.NombreParametro ?? "").FontSize(12);
                                                    parasitologiaTable.Cell().Element(ResultadoStyle).Text(resultado.Resultado ?? "").AlignCenter().FontSize(12);
                                                }
                                            });
                                        }
                                    }
                                    else if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("TINCION WRIGTH"))
                                    {
                                        // Mostrar encabezado solo si es el primer examen o no es la misma tabla que la anterior
                                        if (!esMismaTabla && (esPrimerExamenEnOrden || !puedenCaberEnUnaPagina || esPrimerExamenEnPagina))
                                        {
                                            column.Item().Table(headerTable =>
                                            {
                                                headerTable.ColumnsDefinition(columns =>
                                                {
                                                    columns.RelativeColumn(2.5f); // Parámetro
                                                    columns.RelativeColumn(4);    // Resultado
                                                });

                                                headerTable.Header(header =>
                                                {
                                                    header.Cell().Element(CellStyle).AlignLeft().Text("      ANÁLISIS").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                    header.Cell().Element(CellStyle).AlignLeft().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                });
                                            });
                                        }

                                        // Mostrar descripción solo una vez
                                        if (!string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                        {
                                            column.Item().Table(descTable =>
                                            {
                                                descTable.ColumnsDefinition(columns =>
                                                {
                                                    columns.RelativeColumn();
                                                });

                                                descTable.Cell()
                                                    .PaddingVertical(2)
                                                    .Element(DescripcionStyle)
                                                    .Text(detalleOrden.IdtipoExamenNavigation.Descripcion)
                                                    .Bold()
                                                    .FontSize(12);
                                            });
                                        }

                                        column.Item().Table(resultsTable =>
                                        {
                                            resultsTable.ColumnsDefinition(columns =>
                                            {
                                                columns.RelativeColumn(2.5f);
                                                columns.RelativeColumn(4);
                                            });

                                            string currentSubtitulo = null;
                                            foreach (var resultado in resultadosFiltrados)
                                            {
                                                var subtitulo = resultado.IdparametroNavigation?.Subtitulo;
                                                if (subtitulo != currentSubtitulo && !string.IsNullOrEmpty(subtitulo))
                                                {
                                                    resultsTable.Cell().ColumnSpan(2)
                                                        .PaddingVertical(2)
                                                        .Element(SubtituloStyle)
                                                        .Text(subtitulo)
                                                        .Bold()
                                                        .FontSize(12);
                                                    currentSubtitulo = subtitulo;
                                                }

                                                resultsTable.Cell().Element(ResultadoStyle).Text(resultado.NombreParametro ?? "").FontSize(12);
                                                resultsTable.Cell().Element(ResultadoStyle).Text(resultado.Resultado ?? "").FontSize(12);
                                            }
                                        });
                                    }
                                    else if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("HEMATOLOGÍA"))
                                    {
                                        var listaResultados = resultadosFiltrados.ToList();
                                        var resultadosPorPagina = new List<List<ResultadoExaman>>();
                                        int resultadosPorPaginaCount = 15;

                                        // Obtener el género del paciente
                                        var generoPaciente = detalleOrden.IdordenNavigation.IdclienteNavigation.Genero?.ToUpper() ?? "M";
                                        var esNino = edad < 18;

                                        // Variables para verificar relación entre Segmentados y Linfocitos
                                        double valorSegmentados = 0;
                                        double valorLinfocitos = 0;
                                        bool segmentadosFueraRango = false;
                                        bool linfocitosFueraRango = false;
                                        bool marcarSoloSegmentados = false;
                                        bool marcarSoloLinfocitos = false;

                                        // Primera pasada para verificar Segmentados y Linfocitos
                                        foreach (var resultado in listaResultados)
                                        {
                                            var nombreParametro = resultado.NombreParametro ?? "";
                                            var valorResultado = resultado.Resultado ?? "";
                                            var valorReferencia = resultado.IdparametroNavigation?.ValorReferencia ?? "";

                                            if (nombreParametro.ToUpper().Contains("SEGMENTADOS"))
                                            {
                                                segmentadosFueraRango = IsResultOutOfReferenceRange(valorResultado, valorReferencia, "HEMATOLOGÍA");
                                                valorSegmentados = ExtraerPrimerNumero(valorResultado);
                                            }
                                            else if (nombreParametro.ToUpper().Contains("LINFOCITOS"))
                                            {
                                                linfocitosFueraRango = IsResultOutOfReferenceRange(valorResultado, valorReferencia, "HEMATOLOGÍA");
                                                valorLinfocitos = ExtraerPrimerNumero(valorResultado);
                                            }
                                        }

                                        // Lógica para determinar qué marcar en negrita
                                        if (segmentadosFueraRango && linfocitosFueraRango)
                                        {
                                            if (valorSegmentados > valorLinfocitos)
                                            {
                                                marcarSoloSegmentados = true;
                                            }
                                            else
                                            {
                                                marcarSoloLinfocitos = true;
                                            }
                                        }
                                        else if (segmentadosFueraRango)
                                        {
                                            marcarSoloSegmentados = true;
                                        }
                                        else if (linfocitosFueraRango)
                                        {
                                            marcarSoloLinfocitos = true;
                                        }

                                        for (int j = 0; j < listaResultados.Count; j += resultadosPorPaginaCount)
                                        {
                                            resultadosPorPagina.Add(listaResultados
                                                .Skip(j)
                                                .Take(resultadosPorPaginaCount)
                                                .ToList());
                                        }

                                        for (int j = 0; j < resultadosPorPagina.Count; j++)
                                        {
                                            var resultadosPagina = resultadosPorPagina[j];

                                            // MODIFICACIÓN PRINCIPAL: Mostrar encabezado si:
                                            // 1. Es la primera página del examen (j == 0) Y
                                            // 2. No es la misma tabla que la anterior (!esMismaTabla) Y
                                            // 3. Es el primer examen en la orden (esPrimerExamenEnOrden) O está en una nueva página
                                            if (j == 0 && !esMismaTabla && (esPrimerExamenEnOrden || !puedenCaberEnUnaPagina || esPrimerExamenEnPagina))
                                            {
                                                column.Item().Table(headerTable =>
                                                {
                                                    headerTable.ColumnsDefinition(columns =>
                                                    {
                                                        columns.RelativeColumn(3);
                                                        columns.RelativeColumn(1.3f);
                                                        columns.RelativeColumn(1);
                                                        columns.RelativeColumn(2.5f);
                                                    });

                                                    headerTable.Header(header =>
                                                    {
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("      ANÁLISIS").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                        header.Cell().Element(CellStyle).Text("").Bold().FontColor(Colors.White);
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("VALORES DE REFERENCIA").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                    });

                                                    if (!string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                                    {
                                                        headerTable.Cell().ColumnSpan(4)
                                                            .PaddingVertical(2)
                                                            .Element(DescripcionStyle)
                                                            .Text(detalleOrden.IdtipoExamenNavigation.Descripcion)
                                                            .Bold()
                                                            .FontSize(12);
                                                    }
                                                });
                                            }

                                            column.Item().Table(resultsTable =>
                                            {
                                                resultsTable.ColumnsDefinition(columns =>
                                                {
                                                    columns.RelativeColumn(3);
                                                    columns.RelativeColumn(1.3f);
                                                    columns.RelativeColumn(1);
                                                    columns.RelativeColumn(2.5f);
                                                });

                                                string currentSubtitulo = null;
                                                foreach (var resultado in resultadosPagina)
                                                {
                                                    var subtitulo = resultado.IdparametroNavigation?.Subtitulo;
                                                    if (subtitulo != currentSubtitulo && !string.IsNullOrEmpty(subtitulo))
                                                    {
                                                        resultsTable.Cell().ColumnSpan(4)
                                                            .PaddingVertical(2)
                                                            .Element(SubtituloStyle)
                                                            .Text(subtitulo)
                                                            .Bold()
                                                            .FontSize(12);
                                                        currentSubtitulo = subtitulo;
                                                    }

                                                    var nombreParametro = resultado.NombreParametro ?? "";
                                                    var valorResultado = resultado.Resultado ?? "";
                                                    var valorReferencia = resultado.IdparametroNavigation?.ValorReferencia ?? "";

                                                    // Parámetros que van en negrita
                                                    var parametrosNegrita = new[] { "ERITROCITOS", "LEUCOCITOS", "PLAQUETAS", "TIPO Y RH" };
                                                    bool esParametroNegrita = parametrosNegrita.Any(p => nombreParametro.ToUpper().Contains(p));

                                                    // Parámetros con valores por género
                                                    var parametrosGenero = new[] { "HEMATOCRITO", "HEMOGLOBINA" };
                                                    bool esParametroGenero = parametrosGenero.Any(p => nombreParametro.ToUpper().Contains(p));

                                                    // Ajustar valores de referencia según género/edad
                                                    if (esParametroNegrita || esParametroGenero)
                                                    {
                                                        if (nombreParametro.ToUpper().Contains("ERITROCITOS"))
                                                        {
                                                            if (edad < 12)
                                                                valorReferencia = "4,000,000 - 5,200,000";
                                                            else if (generoPaciente == "F")
                                                                valorReferencia = "4,000,000 - 5,200,000";
                                                            else
                                                                valorReferencia = "4,400,000 - 6,000,000";
                                                        }
                                                        else if (nombreParametro.ToUpper().Contains("HEMATOCRITO"))
                                                        {
                                                            if (edad < 12) valorReferencia = "37 - 47";  // Mismo que mujeres adultas
                                                            else if (generoPaciente == "F") valorReferencia = "37 - 47";
                                                            else valorReferencia = "39 - 53";  // Hombres adultos
                                                        }
                                                        else if (nombreParametro.ToUpper().Contains("HEMOGLOBINA"))
                                                        {
                                                            if (edad < 12) valorReferencia = "12 - 16";  // Mismo que mujeres adultas
                                                            else if (generoPaciente == "F") valorReferencia = "12 - 16";
                                                            else valorReferencia = "14 - 18";  // Hombres adultos
                                                        }
                                                    }

                                                    // Nombre del parámetro
                                                    resultsTable.Cell().Element(ResultadoStyle).Text(text =>
                                                    {
                                                        if (esParametroNegrita) text.Span(nombreParametro).Bold().FontSize(12);
                                                        else text.Span(nombreParametro).FontSize(12);
                                                    });

                                                    // Resultado - Caso especial para TIPO Y RH
                                                    if (nombreParametro.ToUpper().Contains("TIPO Y RH"))
                                                    {
                                                        resultsTable.Cell().Element(ResultadoStyle).Text(text =>
                                                        {
                                                            var resultadoUnido = (resultado.Resultado ?? "").Replace("\n", " ").Replace("\r", "");
                                                            text.Span(resultadoUnido).Bold().FontSize(11);
                                                        });
                                                    }
                                                    else
                                                    {
                                                        // Comportamiento normal para otros parámetros
                                                        resultsTable.Cell().Element(ResultadoStyle).Text(text =>
                                                        {
                                                            bool fueraDeRango = IsResultOutOfReferenceRange(valorResultado, valorReferencia, "HEMATOLOGÍA");
                                                            bool mostrarNegrita = fueraDeRango &&
                                                                                       ((nombreParametro.ToUpper().Contains("SEGMENTADOS") && marcarSoloSegmentados) ||
                                                                                        (nombreParametro.ToUpper().Contains("LINFOCITOS") && marcarSoloLinfocitos) ||
                                                                                       (!nombreParametro.ToUpper().Contains("SEGMENTADOS") &&
                                                                                        !nombreParametro.ToUpper().Contains("LINFOCITOS") && fueraDeRango));

                                                            if (mostrarNegrita) text.Span(valorResultado).Bold().FontColor(Colors.Black).FontSize(12);
                                                            else text.Span(valorResultado).FontSize(12);
                                                        });
                                                    }

                                                    resultsTable.Cell().Element(ResultadoStyle).PaddingLeft(-20).Text(resultado.IdparametroNavigation?.UnidadMedida ?? "").FontSize(12);
                                                    resultsTable.Cell().Element(ResultadoStyle).Text(valorReferencia).FontSize(12);
                                                }
                                            });
                                        }

                                        // Nota al pie
                                        column.Item().PaddingTop(10).Text("**Intervalos de referencias obtenidos del libro: Hematología, la sangre y sus enfermedades; 2da edición, 2009.")
                                            .FontSize(10);
                                    }
                                    else if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("QUÍMICA SANGUÍNEA"))
                                    {
                                        var listaResultados = resultadosFiltrados.ToList();
                                        var resultadosPorPagina = new List<List<ResultadoExaman>>();
                                        int resultadosPorPaginaCount = 15;

                                        // Obtener el género del paciente
                                        var generoPaciente = detalleOrden.IdordenNavigation.IdclienteNavigation.Genero?.ToUpper() ?? "M";
                                        var esNino = edad < 18; // Asumiendo que menor de 18 años es niño

                                        // Verificar si existe exactamente el parámetro "Glicohemoglobina A1C"
                                        bool tieneGlicohemoglobina = listaResultados.Any(r =>
                                            r.NombreParametro != null &&
                                            r.NombreParametro.Equals("Glicohemoglobina A1C", StringComparison.OrdinalIgnoreCase));

                                        for (int j = 0; j < listaResultados.Count; j += resultadosPorPaginaCount)
                                        {
                                            resultadosPorPagina.Add(listaResultados
                                                .Skip(j)
                                                .Take(resultadosPorPaginaCount)
                                                .ToList());
                                        }

                                        bool descripcionMostrada = false;

                                        for (int j = 0; j < resultadosPorPagina.Count; j++)
                                        {
                                            var resultadosPagina = resultadosPorPagina[j];

                                            // MODIFICACIÓN PRINCIPAL: Mostrar encabezado si:
                                            // 1. Es la primera página del examen (j == 0) Y
                                            // 2. No es la misma tabla que la anterior (!esMismaTabla) Y
                                            // 3. Es el primer examen en la orden (esPrimerExamenEnOrden) O está en una nueva página
                                            if (j == 0 && !esMismaTabla && (esPrimerExamenEnOrden || !puedenCaberEnUnaPagina || esPrimerExamenEnPagina))
                                            {
                                                column.Item().Table(headerTable =>
                                                {
                                                    headerTable.ColumnsDefinition(columns =>
                                                    {
                                                        columns.RelativeColumn(3);     // ANÁLISIS
                                                        columns.RelativeColumn(1.3f);  // RESULTADO
                                                        columns.RelativeColumn(1);     // UNIDAD DE MEDIDA
                                                        columns.RelativeColumn(2.5f);  // VALORES DE REFERENCIA
                                                    });

                                                    headerTable.Header(header =>
                                                    {
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("      ANÁLISIS").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                        header.Cell().Element(CellStyle).Text("").Bold().FontColor(Colors.White);
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("VALORES DE REFERENCIA").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                    });
                                                });
                                            }

                                            column.Item().Table(resultsTable =>
                                            {
                                                resultsTable.ColumnsDefinition(columns =>
                                                {
                                                    columns.RelativeColumn(3);
                                                    columns.RelativeColumn(1.3f);
                                                    columns.RelativeColumn(1);
                                                    columns.RelativeColumn(2.5f);
                                                });

                                                // Mostrar descripción solo una vez en la primera página
                                                if (!descripcionMostrada && !string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                                {
                                                    resultsTable.Cell().ColumnSpan(4)
                                                        .PaddingVertical(2)
                                                        .Element(DescripcionStyle)
                                                        .Text(detalleOrden.IdtipoExamenNavigation.Descripcion)
                                                        .Bold()
                                                        .FontSize(12);
                                                    descripcionMostrada = true;
                                                }

                                                string currentSubtitulo = null;

                                                foreach (var resultado in resultadosPagina)
                                                {
                                                    var subtitulo = resultado.IdparametroNavigation?.Subtitulo;
                                                    if (subtitulo != currentSubtitulo && !string.IsNullOrEmpty(subtitulo))
                                                    {
                                                        resultsTable.Cell().ColumnSpan(4)
                                                            .PaddingVertical(2)
                                                            .Element(SubtituloStyle)
                                                            .Text(subtitulo)
                                                            .Bold()
                                                            .FontSize(12);
                                                        currentSubtitulo = subtitulo;
                                                    }

                                                    var nombreParametro = resultado.NombreParametro ?? "";
                                                    string valorReferencia = resultado.IdparametroNavigation?.ValorReferencia ?? "";

                                                    // Aplicar lógica de valores por género/edad para Química Sanguínea
                                                    if (nombreParametro.ToUpper().Contains("CREATININA"))
                                                    {
                                                        if (edad < 10) // Niños menores de 10 años
                                                        {
                                                            valorReferencia = "0.3 - 0.7 mg/dL";
                                                        }
                                                        else if (edad >= 10 && edad < 18) // Niños de 10 a 17 años
                                                        {
                                                            valorReferencia = "0.7 - 1.4 mg/dL";
                                                        }
                                                        else if (generoPaciente == "F") // Mujeres adultas (18+)
                                                        {
                                                            valorReferencia = "0.6 - 1.1 mg/dL";
                                                        }
                                                        else // Hombres adultos (18+)
                                                        {
                                                            valorReferencia = "0.7 - 1.4 mg/dL";
                                                        }
                                                    }
                                                    else if (nombreParametro.ToUpper().Contains("ÁCIDO ÚRICO") || nombreParametro.ToUpper().Contains("ACIDO URICO"))
                                                    {
                                                        if (generoPaciente == "F")
                                                            valorReferencia = "2.6 - 6.0 mg/dL";
                                                        else
                                                            valorReferencia = "3.5 - 7.2 mg/dL";
                                                    }
                                                    else if (nombreParametro.ToUpper().Contains("TRANSAMINASA OXALACÉTICA") ||
                                                             nombreParametro.ToUpper().Contains("TGO") ||
                                                             nombreParametro.ToUpper().Contains("AST"))
                                                    {
                                                        if (generoPaciente == "F")
                                                            valorReferencia = "Menor de 31 U/L";
                                                        else
                                                            valorReferencia = "Menor de 35 U/L";
                                                    }
                                                    else if (nombreParametro.ToUpper().Contains("TRANSAMINASA PIRÚVICA") ||
                                                             nombreParametro.ToUpper().Contains("TGP") ||
                                                             nombreParametro.ToUpper().Contains("ALT"))
                                                    {
                                                        if (generoPaciente == "F")
                                                            valorReferencia = "Menor de 31 U/L";
                                                        else
                                                            valorReferencia = "Menor de 41 U/L";
                                                    }
                                                    else if (nombreParametro.ToUpper().Contains("LDH"))
                                                    {
                                                        if (generoPaciente == "F")
                                                            valorReferencia = "Menor de 247 U/L";
                                                        else
                                                            valorReferencia = "Menor de 248 U/L";
                                                    }

                                                    resultsTable.Cell().Element(ResultadoStyle).Text(nombreParametro).FontSize(12);
                                                    resultsTable.Cell().Element(ResultadoStyle).Text(text =>
                                                    {
                                                        bool esValorAnormal = IsResultOutOfReferenceRange(
                                                            resultado.Resultado ?? "",
                                                            valorReferencia,
                                                            "QUÍMICA SANGUÍNEA"
                                                        );
                                                        if (esValorAnormal)
                                                        {
                                                            text.Span(resultado.Resultado ?? "").Bold().FontColor(Colors.Black).FontSize(12);
                                                        }
                                                        else
                                                        {
                                                            text.Span(resultado.Resultado ?? "").FontSize(12);
                                                        }
                                                    });
                                                    resultsTable.Cell().Element(ResultadoStyle).PaddingLeft(-40).Text(resultado.IdparametroNavigation?.UnidadMedida ?? "").FontSize(12);
                                                    resultsTable.Cell().Element(ResultadoStyle).Text(valorReferencia).FontSize(12);
                                                }
                                            });
                                        }

                                        // Mostrar notas solo si existe el parámetro exacto "Glicohemoglobina A1C"
                                        if (tieneGlicohemoglobina)
                                        {
                                            column.Item().PaddingTop(12).AlignCenter().Column(col =>
                                            {
                                                col.Item().Text(text =>
                                                {
                                                    text.Span("VALORES DE REFERENCIA").Bold();
                                                });

                                                col.Item().PaddingLeft(10).Text(text =>
                                                {
                                                    text.Span("- 4.5 a 5.6     Paciente no Diabético").FontSize(10);
                                                });

                                                col.Item().PaddingLeft(10).Text(text =>
                                                {
                                                    text.Span("- 5.7 a 6.0     Riesgo de desarrollar Diabetes").FontSize(10);
                                                });

                                                col.Item().PaddingLeft(10).Text(text =>
                                                {
                                                    text.Span("- 6.1 a 6.5     Alto riesgo de desarrollar Diabetes").FontSize(10);
                                                });

                                                col.Item().PaddingLeft(10).Text(text =>
                                                {
                                                    text.Span("- Paciente diabético, mal controlado o con metabolismo desequilibrado mayor de 8.5%").FontSize(10);
                                                });
                                            });
                                        }
                                    }
                                    else if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("SEROLOGÍA"))
                                    {
                                        var listaResultados = resultadosFiltrados.ToList();
                                        var resultadosPorPagina = new List<List<ResultadoExaman>>();
                                        int resultadosPorPaginaCount = 15;

                                        for (int j = 0; j < listaResultados.Count; j += resultadosPorPaginaCount)
                                        {
                                            resultadosPorPagina.Add(listaResultados
                                                .Skip(j)
                                                .Take(resultadosPorPaginaCount)
                                                .ToList());
                                        }

                                        for (int j = 0; j < resultadosPorPagina.Count; j++)
                                        {
                                            var resultadosPagina = resultadosPorPagina[j];

                                            // MODIFICACIÓN PRINCIPAL: Mostrar encabezado si:
                                            // 1. Es la primera página del examen (j == 0) Y
                                            // 2. No es la misma tabla que la anterior (!esMismaTabla) Y
                                            // 3. Es el primer examen en la orden (esPrimerExamenEnOrden) O está en una nueva página
                                            if (j == 0 && !esMismaTabla && (esPrimerExamenEnOrden || !puedenCaberEnUnaPagina || esPrimerExamenEnPagina))
                                            {
                                                column.Item().Table(headerTable =>
                                                {
                                                    headerTable.ColumnsDefinition(columns =>
                                                    {
                                                        columns.RelativeColumn(3);     // ANÁLISIS
                                                        columns.RelativeColumn(1.3f);  // RESULTADO
                                                        columns.RelativeColumn(1);     // UNIDAD DE MEDIDA (vacío en algunos casos)
                                                        columns.RelativeColumn(2.5f);  // VALORES DE REFERENCIA
                                                    });

                                                    headerTable.Header(header =>
                                                    {
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("      ANÁLISIS").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                        header.Cell().Element(CellStyle).Text("").Bold().FontColor(Colors.White);
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("VALORES DE REFERENCIA").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                    });
                                                });
                                            }

                                            column.Item().Table(resultsTable =>
                                            {
                                                resultsTable.ColumnsDefinition(columns =>
                                                {
                                                    columns.RelativeColumn(3);
                                                    columns.RelativeColumn(1.3f);
                                                    columns.RelativeColumn(1);
                                                    columns.RelativeColumn(2.5f);
                                                });

                                                string currentSubtitulo = null;
                                                bool descripcionAgregada = false;

                                                foreach (var resultado in resultadosPagina)
                                                {
                                                    // Agregar descripción solo una vez, antes del primer parámetro
                                                    if (!descripcionAgregada && !string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                                    {
                                                        resultsTable.Cell().ColumnSpan(4)
                                                            .PaddingVertical(2)
                                                            .Element(DescripcionStyle)
                                                            .Text(detalleOrden.IdtipoExamenNavigation.Descripcion)
                                                            .Bold()
                                                            .FontSize(12);

                                                        descripcionAgregada = true;
                                                    }

                                                    var subtitulo = resultado.IdparametroNavigation?.Subtitulo;
                                                    if (subtitulo != currentSubtitulo && !string.IsNullOrEmpty(subtitulo))
                                                    {
                                                        resultsTable.Cell().ColumnSpan(4)
                                                            .PaddingVertical(2)
                                                            .Element(SubtituloStyle)
                                                            .Text(subtitulo)
                                                            .Bold()
                                                            .FontSize(12);
                                                        currentSubtitulo = subtitulo;
                                                    }

                                                    var nombreParametro = resultado.NombreParametro ?? "";
                                                    var valorResultado = resultado.Resultado ?? "";
                                                    var valorReferencia = resultado.IdparametroNavigation?.ValorReferencia ?? "";

                                                    // Nombre del parámetro
                                                    resultsTable.Cell().Element(ResultadoStyle).Text(nombreParametro).FontSize(12);

                                                    // Resultado (negrita si es anormal)
                                                    bool esValorAnormal = IsResultOutOfReferenceRange(valorResultado, valorReferencia, "SEROLOGÍA");
                                                    resultsTable.Cell().Element(ResultadoStyle).Text(text =>
                                                    {
                                                        if (esValorAnormal)
                                                            text.Span(valorResultado).Bold().FontColor(Colors.Black).FontSize(12);
                                                        else
                                                            text.Span(valorResultado).FontSize(12);
                                                    });

                                                    // Unidad de medida (puede ir vacío si no aplica)
                                                    resultsTable.Cell().Element(ResultadoStyle).PaddingLeft(-20).Text(resultado.IdparametroNavigation?.UnidadMedida ?? "").FontSize(12);

                                                    // Valor de referencia
                                                    resultsTable.Cell().Element(ResultadoStyle).Text(valorReferencia).FontSize(12);
                                                }
                                            });
                                        }
                                    }
                                    else if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("CITOLOGÍA FECAL"))
                                    {
                                        // Estilo especial para Citología Fecal con más espacio vertical pero sin bordes
                                        Func<IContainer, IContainer> CeldaAltaStyle = cell => cell
                                            .PaddingVertical(10)  // Aumentamos el espacio vertical (antes era ~5)
                                            .PaddingHorizontal(5);

                                        // Mostrar encabezado solo si es el primer examen o no es la misma tabla que la anterior
                                        if (!esMismaTabla && (esPrimerExamenEnOrden || !puedenCaberEnUnaPagina || esPrimerExamenEnPagina))
                                        {
                                            column.Item().Table(headerTable =>
                                            {
                                                headerTable.ColumnsDefinition(columns =>
                                                {
                                                    columns.RelativeColumn(3);     // ANÁLISIS
                                                    columns.RelativeColumn(1.3f);  // RESULTADO
                                                    columns.RelativeColumn(1);     // UNIDAD DE MEDIDA
                                                    columns.RelativeColumn(2.5f);  // VALORES DE REFERENCIA
                                                });

                                                headerTable.Header(header =>
                                                {
                                                    header.Cell().Element(CellStyle).AlignLeft().Text("      ANÁLISIS").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                    header.Cell().Element(CellStyle).AlignLeft().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                    header.Cell().Element(CellStyle).Text("").Bold().FontColor(Colors.White);
                                                    header.Cell().Element(CellStyle).AlignLeft().Text("VALORES DE REFERENCIA").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                });
                                            });
                                        }

                                        // Mostrar descripción solo una vez
                                        if (!string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                        {
                                            column.Item().Table(descTable =>
                                            {
                                                descTable.ColumnsDefinition(columns =>
                                                {
                                                    columns.RelativeColumn();
                                                });

                                                descTable.Cell()
                                                    .PaddingVertical(10)  // Más espacio para la descripción
                                                    .Element(DescripcionStyleSinBordes)
                                                    .Text(detalleOrden.IdtipoExamenNavigation.Descripcion)
                                                    .Bold()
                                                    .FontSize(12);
                                            });
                                        }

                                        column.Item().Table(resultsTable =>
                                        {
                                            resultsTable.ColumnsDefinition(columns =>
                                            {
                                                columns.RelativeColumn(3);
                                                columns.RelativeColumn(1.3f);
                                                columns.RelativeColumn(1);
                                                columns.RelativeColumn(2.5f);
                                            });

                                            string currentSubtitulo = null;
                                            foreach (var resultado in resultadosFiltrados)
                                            {
                                                var subtitulo = resultado.IdparametroNavigation?.Subtitulo;
                                                if (subtitulo != currentSubtitulo && !string.IsNullOrEmpty(subtitulo))
                                                {
                                                    resultsTable.Cell().ColumnSpan(4)
                                                        .PaddingVertical(10)  // Más espacio para subtítulos
                                                        .Element(SubtituloStyleSinBordes)
                                                        .Text(subtitulo)
                                                        .Bold()
                                                        .FontSize(12);
                                                    currentSubtitulo = subtitulo;
                                                }

                                                // Aplicar el estilo con más espacio vertical
                                                resultsTable.Cell().Element(CeldaAltaStyle).Text(resultado.NombreParametro ?? "").FontSize(12);
                                                resultsTable.Cell().Element(CeldaAltaStyle).Text(resultado.Resultado ?? "").FontSize(12);
                                                resultsTable.Cell().Element(CeldaAltaStyle).Text(resultado.IdparametroNavigation?.UnidadMedida ?? "").FontSize(12);
                                                resultsTable.Cell().Element(CeldaAltaStyle).Text(resultado.IdparametroNavigation?.ValorReferencia ?? "").FontSize(12);
                                            }
                                        });
                                    }
                                    else if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("COAGULACIÓN"))
                                    {
                                        var listaResultados = resultadosFiltrados.ToList();
                                        var resultadosPorPagina = new List<List<ResultadoExaman>>();
                                        int resultadosPorPaginaCount = 15;

                                        for (int j = 0; j < listaResultados.Count; j += resultadosPorPaginaCount)
                                        {
                                            resultadosPorPagina.Add(listaResultados
                                                .Skip(j)
                                                .Take(resultadosPorPaginaCount)
                                                .ToList());
                                        }

                                        bool descripcionMostrada = false;

                                        for (int j = 0; j < resultadosPorPagina.Count; j++)
                                        {
                                            var resultadosPagina = resultadosPorPagina[j];

                                            // Mostrar encabezado solo si:
                                            // 1. Es la primera página del examen (j == 0) Y
                                            // 2. No es la misma tabla que la anterior (!esMismaTabla) Y
                                            // 3. Es el primer examen en la orden (esPrimerExamenEnOrden) O está en una nueva página
                                            if (j == 0)
                                            {
                                                column.Item().Table(headerTable =>
                                                {
                                                    headerTable.ColumnsDefinition(columns =>
                                                    {
                                                        columns.RelativeColumn(3);     // ANÁLISIS
                                                        columns.RelativeColumn(1.8f);  // RESULTADO
                                                        columns.RelativeColumn(2.4f);  // VALORES DE REFERENCIA
                                                    });

                                                    headerTable.Header(header =>
                                                    {
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("      ANÁLISIS").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("VALORES DE REFERENCIA").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                    });
                                                });
                                            }

                                            column.Item().Table(resultsTable =>
                                            {
                                                resultsTable.ColumnsDefinition(columns =>
                                                {
                                                    columns.RelativeColumn(3);
                                                    columns.RelativeColumn(1.8f);
                                                    columns.RelativeColumn(2.4f);
                                                });

                                                // Mostrar descripción solo una vez en la primera página
                                                if (!descripcionMostrada && !string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                                {
                                                    resultsTable.Cell().ColumnSpan(3)
                                                        .PaddingVertical(2)
                                                        .Element(DescripcionStyle)
                                                        .Text(detalleOrden.IdtipoExamenNavigation.Descripcion)
                                                        .Bold()
                                                        .FontSize(12);
                                                    descripcionMostrada = true;
                                                }

                                                string currentSubtitulo = null;
                                                foreach (var resultado in resultadosPagina)
                                                {
                                                    var subtitulo = resultado.IdparametroNavigation?.Subtitulo;
                                                    if (subtitulo != currentSubtitulo && !string.IsNullOrEmpty(subtitulo))
                                                    {
                                                        resultsTable.Cell().ColumnSpan(3)
                                                            .PaddingVertical(2)
                                                            .Element(SubtituloStyle)
                                                            .Text(subtitulo)
                                                            .Bold()
                                                            .FontSize(12);
                                                        currentSubtitulo = subtitulo;
                                                    }


                                                    var nombreParametro = resultado.NombreParametro ?? "";
                                                    var valorResultado = resultado.Resultado ?? "";
                                                    var valorReferencia = resultado.IdparametroNavigation?.ValorReferencia ?? "";

                                                    // Nombre del parámetro
                                                    resultsTable.Cell().Element(ResultadoStyle).Text(nombreParametro).FontSize(12);

                                                    // Resultado centrado
                                                    resultsTable.Cell().Element(ResultadoStyle).Text(valorResultado).FontSize(12);

                                                    // Valor de referencia
                                                    resultsTable.Cell().Element(ResultadoStyle).Text(valorReferencia).FontSize(12);
                                                }
                                            });
                                        }
                                    }
                                    else if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("UROCULTIVO"))
                                    {
                                        // Verificar si es un urocultivo negativo:
                                        // 1. Si hay un parámetro llamado "OBSERVACION" o "NOTA"
                                        // 2. O si todos los parámetros están vacíos (excepto posibles notas)
                                        bool esUrocultivoNegativo = resultadosFiltrados.Any(r =>
                                            r.NombreParametro != null &&
                                            (r.NombreParametro.Equals("OBSERVACION", StringComparison.OrdinalIgnoreCase) ||
                                             r.NombreParametro.Equals("NOTA", StringComparison.OrdinalIgnoreCase))) ||
                                           !resultadosFiltrados.Any(r =>
                                               !string.IsNullOrWhiteSpace(r.Resultado) &&
                                               r.NombreParametro != null &&
                                               !r.NombreParametro.Equals("OBSERVACION", StringComparison.OrdinalIgnoreCase) &&
                                               !r.NombreParametro.Equals("NOTA", StringComparison.OrdinalIgnoreCase));

                                        if (esUrocultivoNegativo)
                                        {
                                            // Mostrar formato de UROCULTIVO NEGATIVO
                                            column.Item().PaddingTop(15).AlignCenter().Column(centeredColumn =>
                                            {
                                                centeredColumn.Item().PaddingBottom(10).Text(text =>
                                                {
                                                    text.Span("RESULTADO").Bold().FontSize(12);
                                                });

                                                centeredColumn.Item().PaddingBottom(20).AlignCenter().Text(text =>
                                                {
                                                    text.Span("NO HUBO CRECIMIENTO BACTERIANO EN 48 HORAS DE INCUBACIÓN.").FontSize(12);
                                                });

                                                // Mostrar la NOTA personalizada si existe y no es solo un punto
                                                if (notaParametro != null && !string.IsNullOrWhiteSpace(notaParametro.Resultado))
                                                {
                                                    string nota = notaParametro.Resultado.Trim();
                                                    if (nota != ".")
                                                    {
                                                        centeredColumn.Item().PaddingBottom(10).Text(text =>
                                                        {
                                                            text.Span("NOTA: ").Bold().FontSize(12);
                                                            text.Span(notaParametro.Resultado).FontSize(12);
                                                        });
                                                    }
                                                }

                                                // Agregar la nota estática
                                                centeredColumn.Item().PaddingTop(20).Text(text =>
                                                {
                                                    text.Span("NOTA: ").Bold().FontSize(12);
                                                    text.Span("Para un cultivo de orina apropiado, es esencial la recolección adecuada de la muestra y evitar la ingesta de antibiótico, ya que afecta directamente el resultado del urocultivo.").FontSize(14);
                                                });
                                            });
                                        }
                                        else
                                        {
                                            // Mostrar formato de UROCULTIVO normal
                                            // Separar los 3 primeros parámetros (MICROORGANISMO AISLADO, CONTALE DE COLONIAS, BLEE)
                                            var parametrosEspeciales = resultadosFiltrados
                                                .Where(r => r.NombreParametro != null &&
                                                       (r.NombreParametro.ToUpper().Contains("MICROORGANISMO AISLADO") ||
                                                        r.NombreParametro.ToUpper().Contains("CONTAJE DE COLONIAS") ||
                                                        r.NombreParametro.ToUpper().Contains("BLEE")))
                                                .OrderBy(r => r.Idparametro)
                                                .ToList();

                                            // Los demás parámetros van en la tabla de antibióticos
                                            var parametrosTabla = resultadosFiltrados
                                                .Where(r => !parametrosEspeciales.Contains(r))
                                                .ToList();

                                            // Mostrar los 3 parámetros especiales en una tabla con bordes
                                            column.Item().PaddingTop(10).Table(specialTable =>
                                            {
                                                specialTable.ColumnsDefinition(columns =>
                                                {
                                                    columns.RelativeColumn(3); // Nombre del parámetro
                                                    columns.RelativeColumn(2); // Resultado
                                                });

                                                foreach (var parametro in parametrosEspeciales)
                                                {
                                                    specialTable.Cell().Element(CellContentStyle).Text(text =>
                                                    {
                                                        text.Span($"{parametro.NombreParametro?.ToUpper()}").Bold().FontSize(12);
                                                    });

                                                    // Formatear el resultado si es el parámetro "CONTAJE DE COLONIAS"
                                                    string resultadoFormateado = parametro.Resultado ?? "";
                                                    if (parametro.NombreParametro != null &&
                                                        parametro.NombreParametro.ToUpper().Contains("CONTAJE DE COLONIAS") &&
                                                        !string.IsNullOrWhiteSpace(resultadoFormateado))
                                                    {
                                                        // Reemplazar puntos por comas en los valores numéricos
                                                        resultadoFormateado = resultadoFormateado
                                                            .Replace("20.000", "20,000")
                                                            .Replace("30.000", "30,000")
                                                            .Replace("50.000", "50,000")
                                                            .Replace("80.000", "80,000")
                                                            .Replace(">100.000", ">100,000");
                                                    }

                                                    specialTable.Cell().Element(CellContentStyle).Text(resultadoFormateado).FontSize(12);
                                                }
                                            });

                                            // Mostrar la descripción del examen si existe
                                            if (!string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                            {
                                                column.Item().PaddingTop(15).AlignCenter().Text(detalleOrden.IdtipoExamenNavigation.Descripcion).Bold().FontSize(12);
                                                column.Item().PaddingBottom(10); // Espacio adicional después de la descripción
                                            }

                                            // Mostrar la tabla de antibióticos
                                            column.Item().Table(table =>
                                            {
                                                table.ColumnsDefinition(columns =>
                                                {
                                                    columns.RelativeColumn(3); // Antibiótico
                                                    columns.RelativeColumn(2); // Resultado
                                                });

                                                // Encabezado de la tabla
                                                table.Header(header =>
                                                {
                                                    header.Cell().Element(CellStyle).AlignLeft().Text("     Antibióticos").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                    header.Cell().Element(CellStyle).AlignLeft().Text("Resultados").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                });

                                                // Filas de datos
                                                foreach (var resultado in parametrosTabla)
                                                {
                                                    table.Cell().Element(ResultadoStyle).Text(resultado.NombreParametro ?? "").FontSize(12);
                                                    table.Cell().Element(ResultadoStyle).Text(resultado.Resultado ?? "").FontSize(12);
                                                }
                                            });

                                            // NOTA INDEPENDIENTE PARA UROCULTIVO NORMAL
                                            column.Item().PaddingTop(20).Column(notaColumn =>
                                            {
                                                // Mostrar la NOTA personalizada si existe
                                                if (notaParametro != null && !string.IsNullOrWhiteSpace(notaParametro.Resultado))
                                                {
                                                    notaColumn.Item().Text(text =>
                                                    {
                                                        text.Span("NOTA: ").Bold().FontSize(12);
                                                        text.Span(notaParametro.Resultado).FontSize(12);
                                                    });
                                                }
                                            });
                                        }
                                    }
                                    else // TABLA ESTÁNDAR
                                    {
                                        var listaResultados = resultadosFiltrados.ToList();
                                        var resultadosPorPagina = new List<List<ResultadoExaman>>();
                                        int resultadosPorPaginaCount = 15;

                                        // Variables para controlar lo que se muestra
                                        var subtitulosMostradosEnExamen = new HashSet<string>();
                                        bool descripcionMostrada = false;

                                        for (int j = 0; j < listaResultados.Count; j += resultadosPorPaginaCount)
                                        {
                                            resultadosPorPagina.Add(listaResultados
                                                .Skip(j)
                                                .Take(resultadosPorPaginaCount)
                                                .ToList());
                                        }

                                        for (int j = 0; j < resultadosPorPagina.Count; j++)
                                        {
                                            var resultadosPagina = resultadosPorPagina[j];

                                            // Mostrar encabezado de columnas solo si:
                                            // 1. Es la primera página del examen Y
                                            // 2. No es la misma tabla que la anterior (esMismaTabla == false)
                                            // 3. Es el primer examen en la orden o los exámenes no caben en una página
                                            // MODIFICACIÓN PRINCIPAL: Mostrar encabezado si:
                                            // 1. Es la primera página del examen (j == 0) Y
                                            // 2. No es la misma tabla que la anterior (!esMismaTabla) Y
                                            // 3. Es el primer examen en la orden (esPrimerExamenEnOrden) O está en una nueva página
                                            if (j == 0 && !esMismaTabla && (esPrimerExamenEnOrden || !puedenCaberEnUnaPagina || esPrimerExamenEnPagina))
                                            {
                                                column.Item().Table(headerTable =>
                                                {
                                                    headerTable.ColumnsDefinition(columns =>
                                                    {
                                                        columns.RelativeColumn(3);
                                                        columns.RelativeColumn(1.3f);
                                                        columns.RelativeColumn(1);
                                                        columns.RelativeColumn(2.5f);
                                                    });

                                                    headerTable.Header(header =>
                                                    {
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("      ANÁLISIS").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                        header.Cell().Element(CellStyle).Text("").Bold().FontColor(Colors.White);
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("VALORES DE REFERENCIA").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                    });
                                                });
                                            }

                                            // Mostrar descripción (si existe) SOLO UNA VEZ en la primera página del examen
                                            // Independientemente de si mostramos encabezados o no
                                            if (j == 0 && !descripcionMostrada && !string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                            {
                                                column.Item().Table(descTable =>
                                                {
                                                    descTable.ColumnsDefinition(columns =>
                                                    {
                                                        columns.RelativeColumn();
                                                    });

                                                    descTable.Cell()
                                                        .PaddingVertical(2)
                                                        .Element(DescripcionStyle)
                                                        .Text(detalleOrden.IdtipoExamenNavigation.Descripcion)
                                                        .Bold()
                                                        .FontSize(12);
                                                });

                                                descripcionMostrada = true;
                                            }

                                            // Tabla de resultados
                                            column.Item().Table(resultsTable =>
                                            {
                                                resultsTable.ColumnsDefinition(columns =>
                                                {
                                                    columns.RelativeColumn(3);
                                                    columns.RelativeColumn(1.3f);
                                                    columns.RelativeColumn(1);
                                                    columns.RelativeColumn(2.5f);
                                                });

                                                string currentSubtitulo = null;
                                                foreach (var resultado in resultadosPagina)
                                                {
                                                    var subtitulo = resultado.IdparametroNavigation?.Subtitulo;

                                                    // Mostrar subtítulo solo si:
                                                    // 1. Es diferente al actual Y
                                                    // 2. No está vacío Y
                                                    // 3. No se ha mostrado antes en este examen
                                                    if (subtitulo != currentSubtitulo &&
                                                        !string.IsNullOrEmpty(subtitulo) &&
                                                        !subtitulosMostradosEnExamen.Contains(subtitulo))
                                                    {
                                                        resultsTable.Cell().ColumnSpan(4)
                                                            .PaddingVertical(2)
                                                            .Element(SubtituloStyle)
                                                            .Text(subtitulo)
                                                            .Bold()
                                                            .FontSize(12);

                                                        currentSubtitulo = subtitulo;
                                                        subtitulosMostradosEnExamen.Add(subtitulo);
                                                    }

                                                    // Verificar si es el parámetro "Cristales" o "Cilindros"
                                                    bool esCristales = resultado.NombreParametro?.Contains("Cristales", StringComparison.OrdinalIgnoreCase) ?? false;
                                                    bool esCilindros = resultado.NombreParametro?.Contains("Cilindros", StringComparison.OrdinalIgnoreCase) ?? false;
                                                    bool esColor = resultado.NombreParametro?.Contains("Color", StringComparison.OrdinalIgnoreCase) ?? false;

                                                    if (esCristales || esCilindros || esColor)
                                                    {
                                                        // Para Cristales o Cilindros: ocupar toda la línea
                                                        resultsTable.Cell().Element(ResultadoStyle).Text(resultado.NombreParametro ?? "").FontSize(12);
                                                        resultsTable.Cell().ColumnSpan(3).Element(ResultadoStyle).Text(resultado.Resultado ?? "").FontSize(12);
                                                    }
                                                    else
                                                    {
                                                        // Para otros parámetros: formato normal
                                                        resultsTable.Cell().Element(ResultadoStyle).Text(resultado.NombreParametro ?? "").FontSize(12);
                                                        resultsTable.Cell().Element(ResultadoStyle).Text(resultado.Resultado ?? "").FontSize(12);
                                                        resultsTable.Cell().Element(ResultadoStyle).Text(resultado.IdparametroNavigation?.UnidadMedida ?? "").FontSize(12);
                                                        resultsTable.Cell().Element(ResultadoStyle).Text(resultado.IdparametroNavigation?.ValorReferencia ?? "").FontSize(12);
                                                    }
                                                }
                                            });
                                        }
                                    }

                                    // Mostrar la NOTA si existe y solo para los exámenes específicos
                                    if (notaParametro != null && !string.IsNullOrWhiteSpace(notaParametro.Resultado))
                                    {
                                        var nombreExamen = detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper();

                                        // Excluir UROCULTIVO completamente
                                        bool esUrocultivo = nombreExamen.Contains("UROCULTIVO");

                                        if (!esUrocultivo &&
                                            (nombreExamen.Contains("HEMATOLOGÍA") ||
                                             nombreExamen.Contains("QUÍMICA SANGUÍNEA") ||
                                             // Para la tabla estándar, verifica que no sea ninguno de los otros formatos especiales
                                             (!nombreExamen.Contains("EXÁMENES DIVERSOS") &&
                                              !nombreExamen.Contains("PARASITOLOGÍA") &&
                                              !nombreExamen.Contains("SEROLOGÍA") &&
                                              !nombreExamen.Contains("CITOLOGÍA FECAL") &&
                                              !nombreExamen.Contains("COAGULACIÓN"))))
                                        {
                                            column.Item().PaddingTop(10).Text(text =>
                                            {
                                                text.Span("NOTA: ").Bold();
                                                text.Span(notaParametro.Resultado);
                                            });
                                        }
                                    }


                                    // Actualizar estado para el próximo examen
                                    esPrimerExamenEnPagina = false;
                                    tablaAnterior = (currentColumns, currentHeaders);

                                    // Lógica de salto de página mejorada
                                    if (!esUltimoExamenEnOrden)
                                    {
                                        // Solo saltar página si el próximo examen no es pequeño o no cabe
                                        if (!agruparConSiguiente)
                                        {
                                            column.Item().PageBreak();
                                            datosPacienteMostradosEnPagina = false;
                                            tablaAnterior = null;
                                            esPrimerExamenEnPagina = true;
                                        }
                                    }
                                }

                                // Si no es la última orden, agregar separación
                                if (orden != ordenes.Last())
                                {
                                    column.Item().PageBreak();
                                    datosPacienteMostradosEnPagina = false;
                                    tablaAnterior = null;
                                    ordenActual = null;
                                    esPrimerExamenEnPagina = true;
                                }
                            }
                        });
                    });

                    // Método auxiliar local para determinar el tipo de tabla
                    (int columns, List<string> headers) DeterminarTipoTabla(string nombreExamen, bool esPrimerExamenEnOrden, bool puedenCaberEnUnaPagina, bool esPrimerExamenEnPagina)
                    {
                        if (nombreExamen.Contains("EXÁMENES DIVERSOS"))
                        {
                            return (3, new List<string> { "MUESTRA", "EXAMEN", "RESULTADO" });
                        }
                        else if (esPrimerExamenEnOrden || !puedenCaberEnUnaPagina || esPrimerExamenEnPagina)
                        {
                            // Mostrar encabezado completo cuando:
                            // 1. Es el primer examen de la orden, o
                            // 2. Los exámenes no caben en una sola página, o
                            // 3. Es el primer examen en la página actual
                            return (4, new List<string> { "ANÁLISIS", "RESULTADO", "", "VALORES DE REFERENCIA" });
                        }
                        else
                        {
                            // No mostrar encabezado para exámenes subsiguientes en la misma página
                            return (4, new List<string>());
                        }
                    }
                });

                var pdfBytes = document.GeneratePdf();
                var nombreArchivo = $"Reporte_Completo_{paciente.Nombre?.Replace(" ", "_")}_{DateTime.Now:yyyyMMdd}.pdf";

                return File(pdfBytes, "application/pdf", nombreArchivo);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al generar el reporte: {ex.Message}");
            }
        }







        [HttpGet("generar-reporte-firma/{idDetalleOrden}")]
        public async Task<IActionResult> GenerarReporteExamenFirma(int idDetalleOrden)
        {
            try
            {
                var exePath = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
                var imagePath = Path.Combine(exePath, "img", "logo.jpeg");
                byte[] imageBytes = System.IO.File.ReadAllBytes(imagePath);

                // Obtener datos del detalle de orden
                var detalleOrden = await _context.DetalleOrdens
                    .Include(d => d.IdordenNavigation)
                        .ThenInclude(o => o.IdclienteNavigation)
                    .Include(d => d.IdordenNavigation)
                        .ThenInclude(o => o.IdmedicoNavigation)
                    .Include(d => d.IdtipoExamenNavigation)
                    .Include(d => d.ResultadoExamen)
                        .ThenInclude(r => r.IdparametroNavigation)
                    .FirstOrDefaultAsync(d => d.IddetalleOrden == idDetalleOrden);

                if (detalleOrden == null)
                    return NotFound("Detalle de orden no encontrado");

                var fechaOrden = detalleOrden.IdordenNavigation.FechaOrden ?? DateTime.Now;
                var numeroMuestra = detalleOrden.IdordenNavigation.NumeroMuestra;

                var resultadosFiltrados = detalleOrden.ResultadoExamen
                    .Where(r => !string.IsNullOrWhiteSpace(r.Resultado))
                    .AsEnumerable()
                    .OrderBy(r => r.IdparametroNavigation == null || string.IsNullOrEmpty(r.IdparametroNavigation.Subtitulo) ? 0 : 1)
                    .ThenBy(r => r.Idparametro)
                    .ThenBy(r => r.IdparametroNavigation?.Subtitulo)
                    .ToList();

                if (!resultadosFiltrados.Any())
                    return NotFound("No hay resultados válidos para este examen");

                var edad = detalleOrden.IdordenNavigation.IdclienteNavigation.FechaNacimiento.HasValue ?
                    DateTime.Now.Year - detalleOrden.IdordenNavigation.IdclienteNavigation.FechaNacimiento.Value.Year : 0;
                // Dentro del método GenerarReporteExamen, antes de procesar los resultados:
                var notaParametro = resultadosFiltrados.FirstOrDefault(r =>
                    r.NombreParametro != null &&
                    r.NombreParametro.Equals("NOTA", StringComparison.OrdinalIgnoreCase));

                // Filtrar el parámetro NOTA de los resultados que van en la tabla
                resultadosFiltrados = resultadosFiltrados
                    .Where(r => r.NombreParametro == null ||
                           !r.NombreParametro.Equals("NOTA", StringComparison.OrdinalIgnoreCase))
                    .ToList();

                // Generar PDF
                var document = Document.Create(container =>
                {
                    container.Page(page =>
                    {
                        page.Size(PageSizes.A4);
                        page.Margin(30);
                        page.DefaultTextStyle(x => x.FontSize(10).FontFamily("Times New Roman"));

                        // Encabezado
                        page.Header().Column(column =>
                        {
                            column.Item().Row(row =>
                            {
                                // Reducir el espacio de la imagen o eliminarlo si no es necesario
                                row.RelativeItem(1).AlignLeft().Image(imageBytes, ImageScaling.FitWidth); // Ajustado a 1

                                // Texto principal con espacio relativo mayor
                                row.RelativeItem(3).Column(textColumn =>
                                {
                                    textColumn.Item().AlignCenter().Text("Laboratorio Clínico").Bold().Italic().FontSize(20).FontColor("#1F3864");
                                    textColumn.Item().AlignCenter().Text("Sangre de Cristo").Bold().Italic().FontSize(20).FontColor("#1F3864");
                                    textColumn.Item().AlignCenter().Text("Lic. Miurell Gutiérrez Rivera").Italic().FontSize(12).FontColor("#1F3864");
                                    textColumn.Item().AlignCenter().Text("Lic. Alvaro Bracamonte Nicaragua").Italic().FontSize(12).FontColor("#1F3864");
                                });
                                // Espacio equilibrador a la derecha
                                row.RelativeItem(1); // Espacio vacío del mismo tamaño que la imagen
                            });

                            column.Item().PaddingTop(5).LineHorizontal(1).LineColor(Colors.Grey.Medium);
                            column.Item().PaddingVertical(10);
                        });

                        // Pie de página
                        page.Footer().Column(column =>
                        {
                            column.Item().PaddingBottom(5).AlignRight().Text("Valído: Lic. Miurell Gutiérrez Rivera").FontSize(10);
                            column.Item().PaddingBottom(25);
                            column.Item().PaddingTop(10).AlignCenter().Text("Tu confianza, es nuestra satisfacción").Bold().Italic().FontColor("#1F3864");
                            column.Item().PaddingBottom(20);
                            column.Item().AlignCenter().Text("Dirección: Casa natal de Rubén Darío 4 Cuadras al este, Ciudad Darío, Matagalpa.").Italic();
                            column.Item().AlignCenter().Text("Cel: 85052997").Italic();
                            column.Item().AlignCenter().Text("Correo electrónico: Labsandecris@gmail.com").Italic();
                        });

                        // Contenido
                        page.Content().Column(column =>
                        {
                            // Datos del paciente
                            column.Item().Row(row =>
                            {
                                row.RelativeItem().Text(text =>
                                {
                                    text.Span("Paciente: ").Bold().FontSize(12.5F);
                                    text.Span(detalleOrden.IdordenNavigation.IdclienteNavigation.Nombre ?? "N/A").FontSize(12.5F);
                                });

                                row.RelativeItem().AlignRight().Text(text =>
                                {
                                    text.Span("Sexo - Edad: ").Bold().FontSize(12.5F);
                                    // Busca todas las instancias donde muestras el género y cámbialas así:
                                    text.Span($"{FormatearGenero(detalleOrden.IdordenNavigation.IdclienteNavigation.Genero)} - {edad} Años").FontSize(12.5F);
                                });
                            });

                            column.Item().Row(row =>
                            {
                                row.RelativeItem().Text(text =>
                                {
                                    text.Span("Médico: ").Bold().FontSize(12.5F);
                                    text.Span(detalleOrden.IdordenNavigation.IdmedicoNavigation?.Nombre ?? "N/A").FontSize(12.5F);
                                });

                                row.RelativeItem().AlignRight().Text(text =>
                                {
                                    text.Span("Núm. Muestra: ").Bold().FontSize(12.5F);
                                    text.Span(numeroMuestra.ToString()).FontSize(12.5F);
                                });
                            });

                            column.Item().Row(row =>
                            {
                                row.RelativeItem().Text(text =>
                                {
                                    text.Span("Mx Recepcionado: ").Bold().FontSize(12.5F);
                                    text.Span(detalleOrden.IdordenNavigation.FechaOrden?.ToString("dd/MM/yyyy")).FontSize(12.5F);
                                });

                                row.RelativeItem().AlignRight().Text(text =>
                                {
                                    text.Span("Emisión de resultado: ").Bold().FontSize(12.5F);
                                    text.Span(detalleOrden.IdordenNavigation.FechaEntrega?.ToString("dd/MM/yyyy") ?? "N/A").FontSize(12.5F);
                                });
                            });

                            // Título del examen

                            var tituloExamen = detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("CITOLOGÍA FECAL") ||
                                               detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("TINCION WRIGTH")
                                ? "PARASITOLOGÍA"
                                : detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper();


                            column.Item().PaddingTop(15).AlignCenter().Text(tituloExamen).Bold().FontSize(14);
                            column.Item().PaddingBottom(20);

                            // EXÁMENES DIVERSOS
                            if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("EXÁMENES DIVERSOS"))
                            {
                                var listaResultados = resultadosFiltrados.ToList();
                                var resultadosPorPagina = new List<List<ResultadoExaman>>();
                                int resultadosPorPaginaCount = 15;

                                // Primero separamos los datos en las 3 categorías
                                var muestras = listaResultados
                                    .Where(r => r.NombreParametro != null && r.NombreParametro.ToUpper().Contains("MUESTRA"))
                                    .OrderBy(r => r.Idparametro)
                                    .ToList();

                                var examenes = listaResultados
                                    .Where(r => r.NombreParametro != null &&
                                           !r.NombreParametro.ToUpper().Contains("MUESTRA") &&
                                           !r.NombreParametro.ToUpper().Contains("RESULTADO") &&
                                           !r.NombreParametro.ToUpper().Contains("DIAGNÓSTICO"))
                                    .OrderBy(r => r.Idparametro)
                                    .ToList();

                                var resultados = listaResultados
                                    .Where(r => r.NombreParametro != null &&
                                           (r.NombreParametro.ToUpper().Contains("RESULTADO") ||
                                            r.NombreParametro.ToUpper().Contains("DIAGNÓSTICO")))
                                    .OrderBy(r => r.Idparametro)
                                    .ToList();

                                // Creamos una lista combinada ordenada
                                var listaCombinada = new List<ResultadoExaman>();
                                int maxCount = new[] { muestras.Count, examenes.Count, resultados.Count }.Max();

                                for (int i = 0; i < maxCount; i++)
                                {
                                    if (i < muestras.Count) listaCombinada.Add(muestras[i]);
                                    if (i < examenes.Count) listaCombinada.Add(examenes[i]);
                                    if (i < resultados.Count) listaCombinada.Add(resultados[i]);
                                }

                                // Paginamos la lista combinada
                                for (int i = 0; i < listaCombinada.Count; i += resultadosPorPaginaCount)
                                {
                                    resultadosPorPagina.Add(listaCombinada
                                        .Skip(i)
                                        .Take(resultadosPorPaginaCount)
                                        .ToList());
                                }

                                for (int i = 0; i < resultadosPorPagina.Count; i++)
                                {
                                    var resultadosPagina = resultadosPorPagina[i];

                                    column.Item().Table(diversosTable =>
                                    {
                                        diversosTable.ColumnsDefinition(columns =>
                                        {
                                            columns.RelativeColumn(3);
                                            columns.RelativeColumn(4);
                                            columns.RelativeColumn(3);
                                        });

                                        if (i == 0)
                                        {
                                            diversosTable.Header(header =>
                                            {
                                                header.Cell().Element(CellStyle).AlignLeft().Text("     MUESTRA").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                header.Cell().Element(CellStyle).AlignCenter().Text("EXAMEN").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                header.Cell().Element(CellStyle).AlignCenter().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                            });
                                        }

                                        // Procesamos en grupos de 3 (muestra, examen, resultado)
                                        for (int j = 0; j < resultadosPagina.Count; j += 3)
                                        {
                                            var muestra = resultadosPagina[j];
                                            var examen = j + 1 < resultadosPagina.Count ? resultadosPagina[j + 1] : null;
                                            var resultado = j + 2 < resultadosPagina.Count ? resultadosPagina[j + 2] : null;

                                            // Verificamos los tipos para asegurarnos de que están en la columna correcta
                                            if (muestra != null && !muestra.NombreParametro.ToUpper().Contains("MUESTRA"))
                                            {
                                                // Si no es muestra, rotamos los valores
                                                var temp = muestra;
                                                muestra = examen;
                                                examen = resultado;
                                                resultado = temp;
                                            }

                                            diversosTable.Cell().Element(CellContentStyle).PaddingHorizontal(12).AlignLeft()
                                                .Text(muestra?.Resultado ?? "").FontSize(12);
                                            diversosTable.Cell().Element(CellContentStyle).AlignCenter()
                                                .Text(examen?.NombreParametro ?? examen?.Resultado ?? "").FontSize(12);
                                            diversosTable.Cell().Element(CellContentStyle).AlignCenter()
                                                .Text(resultado?.Resultado ?? "").FontSize(12);
                                        }
                                    });
                                }
                            }

                            else if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("PARASITOLOGÍA"))
                            {
                                // Primero mostramos la tabla estándar para otros parámetros
                                var parametrosNormales = resultadosFiltrados
                                    .Where(r => r.NombreParametro != null &&
                                           !r.NombreParametro.ToUpper().Contains("MUESTRA") &&
                                           !r.NombreParametro.ToUpper().Contains("EXAMEN") &&
                                           !r.NombreParametro.ToUpper().Contains("RESULTADO") &&
                                           !r.NombreParametro.ToUpper().Contains("HELICOBACTER PYLORI") &&
                                           !r.NombreParametro.ToUpper().Contains("SANGRE OCULTA (FOB)"))
                                    .ToList();

                                if (parametrosNormales.Any())
                                {
                                    column.Item().Table(table =>
                                    {
                                        table.ColumnsDefinition(columns =>
                                        {
                                            columns.RelativeColumn(2.5f); // Parámetro
                                            columns.RelativeColumn(4); // Resultado
                                        });

                                        // Encabezado modificado (sin "VALORES DE REFERENCIA")
                                        table.Header(header =>
                                        {
                                            header.Cell().Element(CellStyle).AlignLeft().Text("      ANÁLISIS").Bold().FontColor(Colors.White).FontSize(12.5f);
                                            header.Cell().Element(CellStyle).AlignLeft().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                        });

                                        // Agregar descripción si existe
                                        if (!string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                        {
                                            table.Cell().ColumnSpan(2)
                                                .PaddingVertical(2)
                                                .Element(DescripcionStyle)
                                                .Text(detalleOrden.IdtipoExamenNavigation.Descripcion)
                                                .Bold()
                                                .FontSize(12);
                                        }

                                        string currentSubtitulo = null;
                                        foreach (var resultado in parametrosNormales)
                                        {
                                            var subtitulo = resultado.IdparametroNavigation?.Subtitulo;
                                            if (subtitulo != currentSubtitulo && !string.IsNullOrEmpty(subtitulo))
                                            {
                                                table.Cell().ColumnSpan(2)
                                                    .PaddingVertical(2)
                                                    .Element(SubtituloStyle)
                                                    .Text(subtitulo)
                                                    .Bold()
                                                    .FontSize(12);
                                                currentSubtitulo = subtitulo;
                                            }

                                            table.Cell().Element(ResultadoStyle).Text(resultado.NombreParametro ?? "").FontSize(12);
                                            table.Cell().Element(ResultadoStyle).Text(resultado.Resultado ?? "").FontSize(12);
                                        }
                                    });
                                }

                                // Tabla especial MUESTRA/EXAMEN/RESULTADO para Parasitología
                                var muestras = resultadosFiltrados
                                    .Where(r => r.NombreParametro != null && r.NombreParametro.ToUpper().Contains("MUESTRA"))
                                    .OrderBy(r => r.NombreParametro)
                                    .ToList();

                                var examenesEspeciales = resultadosFiltrados
                                    .Where(r => r.NombreParametro != null &&
                                           (r.NombreParametro.ToUpper().Contains("HELICOBACTER PYLORI") ||
                                            r.NombreParametro.ToUpper().Contains("SANGRE OCULTA (FOB)")))
                                    .OrderBy(r => r.NombreParametro)
                                    .ToList();

                                var resultadosEspeciales = resultadosFiltrados
                                    .Where(r => r.NombreParametro != null && r.NombreParametro.ToUpper().Contains("RESULTADO"))
                                    .OrderBy(r => r.NombreParametro)
                                    .ToList();

                                // Mostrar tabla especial si tenemos al menos un conjunto completo
                                if (muestras.Any() && examenesEspeciales.Any() && resultadosEspeciales.Any())
                                {
                                    column.Item().PaddingTop(10).Table(parasitologiaTable =>
                                    {
                                        parasitologiaTable.ColumnsDefinition(columns =>
                                        {
                                            columns.RelativeColumn(2);
                                            columns.RelativeColumn(3);
                                            columns.RelativeColumn(2);
                                        });

                                        parasitologiaTable.Header(header =>
                                        {
                                            header.Cell().Element(CellStyle).AlignLeft().Text("     MUESTRA").Bold().FontColor(Colors.White).FontSize(12.5f);
                                            header.Cell().Element(CellStyle).AlignCenter().Text("EXAMEN").Bold().FontColor(Colors.White).FontSize(12.5f);
                                            header.Cell().Element(CellStyle).AlignCenter().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                        });

                                        // Determinamos el número máximo de filas a mostrar
                                        int maxRows = Math.Min(muestras.Count, Math.Min(examenesEspeciales.Count, resultadosEspeciales.Count));

                                        for (int i = 0; i < maxRows; i++)
                                        {
                                            var muestra = muestras[i];
                                            var examen = examenesEspeciales[i];
                                            var resultado = resultadosEspeciales[i];

                                            parasitologiaTable.Cell().Element(ResultadoStyle).PaddingHorizontal(12).Text(muestra.Resultado ?? "").FontSize(12);
                                            parasitologiaTable.Cell().Element(ResultadoStyle).AlignCenter().Text(examen.NombreParametro ?? "").FontSize(12);
                                            parasitologiaTable.Cell().Element(ResultadoStyle).Text(resultado.Resultado ?? "").AlignCenter().FontSize(12);
                                        }
                                    });
                                }
                            }
                            else if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("TINCION WRIGTH"))
                            {
                                column.Item().Table(table =>
                                {
                                    table.ColumnsDefinition(columns =>
                                    {
                                        columns.RelativeColumn(2.5f); // Parámetro
                                        columns.RelativeColumn(4);    // Resultado
                                    });

                                    // Encabezado modificado (sin "VALORES DE REFERENCIA")
                                    table.Header(header =>
                                    {
                                        header.Cell().Element(CellStyle).AlignLeft().Text("      ANÁLISIS").Bold().FontColor(Colors.White).FontSize(12.5f);
                                        header.Cell().Element(CellStyle).AlignLeft().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                    });

                                    // Agregar descripción si existe
                                    if (!string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                    {
                                        table.Cell().ColumnSpan(2)
                                            .PaddingVertical(2)
                                            .Element(DescripcionStyle)
                                            .Text(detalleOrden.IdtipoExamenNavigation.Descripcion)
                                            .Bold()
                                            .FontSize(12);
                                    }

                                    string currentSubtitulo = null;
                                    foreach (var resultado in resultadosFiltrados)
                                    {
                                        var subtitulo = resultado.IdparametroNavigation?.Subtitulo;
                                        if (subtitulo != currentSubtitulo && !string.IsNullOrEmpty(subtitulo))
                                        {
                                            table.Cell().ColumnSpan(2)
                                                .PaddingVertical(2)
                                                .Element(SubtituloStyle)
                                                .Text(subtitulo)
                                                .Bold()
                                                .FontSize(12);
                                            currentSubtitulo = subtitulo;
                                        }

                                        table.Cell().Element(ResultadoStyle).Text(resultado.NombreParametro ?? "").FontSize(12);
                                        table.Cell().Element(ResultadoStyle).Text(resultado.Resultado ?? "").FontSize(12);
                                    }
                                });
                            }
                            else if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("HEMATOLOGÍA"))
                            {
                                var listaResultados = resultadosFiltrados.ToList();
                                var resultadosPorPagina = new List<List<ResultadoExaman>>();
                                int resultadosPorPaginaCount = 15;

                                // Obtener el género del paciente
                                var generoPaciente = detalleOrden.IdordenNavigation.IdclienteNavigation.Genero?.ToUpper() ?? "M";
                                var esNino = edad < 18;

                                // Variables para verificar relación entre Segmentados y Linfocitos
                                double valorSegmentados = 0;
                                double valorLinfocitos = 0;
                                bool segmentadosFueraRango = false;
                                bool linfocitosFueraRango = false;
                                bool marcarSoloSegmentados = false;
                                bool marcarSoloLinfocitos = false;

                                // Primera pasada para verificar Segmentados y Linfocitos
                                foreach (var resultado in listaResultados)
                                {
                                    var nombreParametro = resultado.NombreParametro ?? "";
                                    var valorResultado = resultado.Resultado ?? "";
                                    var valorReferencia = resultado.IdparametroNavigation?.ValorReferencia ?? "";

                                    if (nombreParametro.ToUpper().Contains("SEGMENTADOS"))
                                    {
                                        segmentadosFueraRango = IsResultOutOfReferenceRange(valorResultado, valorReferencia, "HEMATOLOGÍA");
                                        valorSegmentados = ExtraerPrimerNumero(valorResultado);
                                    }
                                    else if (nombreParametro.ToUpper().Contains("LINFOCITOS"))
                                    {
                                        linfocitosFueraRango = IsResultOutOfReferenceRange(valorResultado, valorReferencia, "HEMATOLOGÍA");
                                        valorLinfocitos = ExtraerPrimerNumero(valorResultado);
                                    }
                                }

                                // Lógica para determinar qué marcar en negrita
                                if (segmentadosFueraRango && linfocitosFueraRango)
                                {
                                    if (valorSegmentados > valorLinfocitos)
                                    {
                                        marcarSoloSegmentados = true;
                                    }
                                    else
                                    {
                                        marcarSoloLinfocitos = true;
                                    }
                                }
                                else if (segmentadosFueraRango)
                                {
                                    marcarSoloSegmentados = true;
                                }
                                else if (linfocitosFueraRango)
                                {
                                    marcarSoloLinfocitos = true;
                                }

                                for (int i = 0; i < listaResultados.Count; i += resultadosPorPaginaCount)
                                {
                                    resultadosPorPagina.Add(listaResultados
                                        .Skip(i)
                                        .Take(resultadosPorPaginaCount)
                                        .ToList());
                                }

                                for (int i = 0; i < resultadosPorPagina.Count; i++)
                                {
                                    var resultadosPagina = resultadosPorPagina[i];

                                    if (i == 0)
                                    {
                                        column.Item().Table(headerTable =>
                                        {
                                            headerTable.ColumnsDefinition(columns =>
                                            {
                                                columns.RelativeColumn(3);
                                                columns.RelativeColumn(1.3f);
                                                columns.RelativeColumn(1);
                                                columns.RelativeColumn(2.5f);
                                            });

                                            headerTable.Header(header =>
                                            {
                                                header.Cell().Element(CellStyle).AlignLeft().Text("      ANÁLISIS").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                header.Cell().Element(CellStyle).AlignLeft().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                header.Cell().Element(CellStyle).Text("").Bold().FontColor(Colors.White);
                                                header.Cell().Element(CellStyle).AlignLeft().Text("VALORES DE REFERENCIA").Bold().FontColor(Colors.White).FontSize(12.5f);
                                            });

                                            if (!string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                            {
                                                headerTable.Cell().ColumnSpan(4)
                                                    .PaddingVertical(2)
                                                    .Element(DescripcionStyle)
                                                    .Text(detalleOrden.IdtipoExamenNavigation.Descripcion)
                                                    .Bold()
                                                    .FontSize(12);
                                            }
                                        });
                                    }

                                    column.Item().Table(resultsTable =>
                                    {
                                        resultsTable.ColumnsDefinition(columns =>
                                        {
                                            columns.RelativeColumn(3);
                                            columns.RelativeColumn(1.3f);
                                            columns.RelativeColumn(1);
                                            columns.RelativeColumn(2.5f);
                                        });

                                        string currentSubtitulo = null;
                                        foreach (var resultado in resultadosPagina)
                                        {
                                            var subtitulo = resultado.IdparametroNavigation?.Subtitulo;
                                            if (subtitulo != currentSubtitulo && !string.IsNullOrEmpty(subtitulo))
                                            {
                                                resultsTable.Cell().ColumnSpan(4)
                                                    .PaddingVertical(2)
                                                    .Element(SubtituloStyle)
                                                    .Text(subtitulo)
                                                    .Bold()
                                                    .FontSize(12);
                                                currentSubtitulo = subtitulo;
                                            }

                                            var nombreParametro = resultado.NombreParametro ?? "";
                                            var valorResultado = resultado.Resultado ?? "";
                                            var valorReferencia = resultado.IdparametroNavigation?.ValorReferencia ?? "";

                                            // Parámetros que van en negrita
                                            var parametrosNegrita = new[] { "ERITROCITOS", "LEUCOCITOS", "PLAQUETAS", "TIPO Y RH" };
                                            bool esParametroNegrita = parametrosNegrita.Any(p => nombreParametro.ToUpper().Contains(p));

                                            // Parámetros con valores por género
                                            var parametrosGenero = new[] { "HEMATOCRITO", "HEMOGLOBINA" };
                                            bool esParametroGenero = parametrosGenero.Any(p => nombreParametro.ToUpper().Contains(p));

                                            // Ajustar valores de referencia según género/edad
                                            if (esParametroNegrita || esParametroGenero)
                                            {
                                                if (nombreParametro.ToUpper().Contains("ERITROCITOS"))
                                                {
                                                    if (edad < 12)
                                                        valorReferencia = "4,000,000 - 5,200,000";
                                                    else if (generoPaciente == "F")
                                                        valorReferencia = "4,000,000 - 5,200,000";
                                                    else
                                                        valorReferencia = "4,400,000 - 6,000,000";
                                                }
                                                else if (nombreParametro.ToUpper().Contains("HEMATOCRITO"))
                                                {
                                                    if (edad < 12) valorReferencia = "37 - 47";  // Mismo que mujeres adultas
                                                    else if (generoPaciente == "F") valorReferencia = "37 - 47";
                                                    else valorReferencia = "39 - 53";  // Hombres adultos
                                                }
                                                else if (nombreParametro.ToUpper().Contains("HEMOGLOBINA"))
                                                {
                                                    if (edad < 12) valorReferencia = "12 - 16";  // Mismo que mujeres adultas
                                                    else if (generoPaciente == "F") valorReferencia = "12 - 16";
                                                    else valorReferencia = "14 - 18";  // Hombres adultos
                                                }
                                            }

                                            // Nombre del parámetro
                                            resultsTable.Cell().Element(ResultadoStyle).Text(text =>
                                            {
                                                if (esParametroNegrita) text.Span(nombreParametro).Bold().FontSize(12);
                                                else text.Span(nombreParametro).FontSize(12);
                                            });

                                            // Resultado - Caso especial para TIPO Y RH
                                            if (nombreParametro.ToUpper().Contains("TIPO Y RH"))
                                            {
                                                resultsTable.Cell().Element(ResultadoStyle).Text(text =>
                                                {
                                                    var resultadoUnido = (resultado.Resultado ?? "").Replace("\n", " ").Replace("\r", "");
                                                    text.Span(resultadoUnido).Bold().FontSize(11);
                                                });
                                            }
                                            else
                                            {
                                                // Comportamiento normal para otros parámetros
                                                resultsTable.Cell().Element(ResultadoStyle).Text(text =>
                                                {
                                                    bool fueraDeRango = IsResultOutOfReferenceRange(valorResultado, valorReferencia, "HEMATOLOGÍA");
                                                    bool mostrarNegrita = fueraDeRango &&
                                                                       ((nombreParametro.ToUpper().Contains("SEGMENTADOS") && marcarSoloSegmentados) ||
                                                                        (nombreParametro.ToUpper().Contains("LINFOCITOS") && marcarSoloLinfocitos) ||
                                                                       (!nombreParametro.ToUpper().Contains("SEGMENTADOS") &&
                                                                        !nombreParametro.ToUpper().Contains("LINFOCITOS") && fueraDeRango));

                                                    if (mostrarNegrita) text.Span(valorResultado).Bold().FontColor(Colors.Black).FontSize(12);
                                                    else text.Span(valorResultado).FontSize(12);
                                                });
                                            }

                                            resultsTable.Cell().Element(ResultadoStyle).PaddingLeft(-20).Text(resultado.IdparametroNavigation?.UnidadMedida ?? "").FontSize(12);
                                            resultsTable.Cell().Element(ResultadoStyle).Text(valorReferencia).FontSize(12);
                                        }
                                    });
                                }

                                // Nota al pie
                                column.Item().PaddingTop(10).Text("**Intervalos de referencias obtenidos del libro: Hematología, la sangre y sus enfermedades; 2da edición, 2009.")
                                    .FontSize(10);
                            }
                            else if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("QUÍMICA SANGUÍNEA"))
                            {
                                var listaResultados = resultadosFiltrados.ToList();
                                var resultadosPorPagina = new List<List<ResultadoExaman>>();
                                int resultadosPorPaginaCount = 15;

                                // Obtener el género del paciente
                                var generoPaciente = detalleOrden.IdordenNavigation.IdclienteNavigation.Genero?.ToUpper() ?? "M";
                                var esNino = edad < 18; // Asumiendo que menor de 18 años es niño

                                // Verificar si existe exactamente el parámetro "Glicohemoglobina A1C"
                                bool tieneGlicohemoglobina = listaResultados.Any(r =>
                                    r.NombreParametro != null &&
                                    r.NombreParametro.Equals("Glicohemoglobina A1C", StringComparison.OrdinalIgnoreCase));

                                for (int i = 0; i < listaResultados.Count; i += resultadosPorPaginaCount)
                                {
                                    resultadosPorPagina.Add(listaResultados
                                        .Skip(i)
                                        .Take(resultadosPorPaginaCount)
                                        .ToList());
                                }

                                for (int i = 0; i < resultadosPorPagina.Count; i++)
                                {
                                    var resultadosPagina = resultadosPorPagina[i];

                                    if (i == 0)
                                    {
                                        column.Item().Table(headerTable =>
                                        {
                                            headerTable.ColumnsDefinition(columns =>
                                            {
                                                columns.RelativeColumn(3);     // ANÁLISIS
                                                columns.RelativeColumn(1.3f);  // RESULTADO
                                                columns.RelativeColumn(1);     // UNIDAD DE MEDIDA
                                                columns.RelativeColumn(2.5f);  // VALORES DE REFERENCIA
                                            });

                                            headerTable.Header(header =>
                                            {
                                                header.Cell().Element(CellStyle).AlignLeft().Text("      ANÁLISIS").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                header.Cell().Element(CellStyle).AlignLeft().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                header.Cell().Element(CellStyle).Text("").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                header.Cell().Element(CellStyle).AlignLeft().Text("VALORES DE REFERENCIA").Bold().FontColor(Colors.White).FontSize(12.5f);
                                            });

                                            if (!string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                            {
                                                headerTable.Cell().ColumnSpan(4)
                                                    .PaddingVertical(2)
                                                    .Element(DescripcionStyle)
                                                    .Text(detalleOrden.IdtipoExamenNavigation.Descripcion)
                                                    .Bold()
                                                    .FontSize(12);
                                            }
                                        });
                                    }

                                    column.Item().Table(resultsTable =>
                                    {
                                        resultsTable.ColumnsDefinition(columns =>
                                        {
                                            columns.RelativeColumn(3);
                                            columns.RelativeColumn(1.3f);
                                            columns.RelativeColumn(1);
                                            columns.RelativeColumn(2.5f);
                                        });

                                        string currentSubtitulo = null;
                                        foreach (var resultado in resultadosPagina)
                                        {
                                            var subtitulo = resultado.IdparametroNavigation?.Subtitulo;
                                            if (subtitulo != currentSubtitulo && !string.IsNullOrEmpty(subtitulo))
                                            {
                                                resultsTable.Cell().ColumnSpan(4)
                                                    .PaddingVertical(2)
                                                    .Element(SubtituloStyle)
                                                    .Text(subtitulo)
                                                    .Bold()
                                                    .FontSize(12);
                                                currentSubtitulo = subtitulo;
                                            }

                                            var nombreParametro = resultado.NombreParametro ?? "";

                                            // Obtener el valor de referencia original
                                            string valorReferencia = resultado.IdparametroNavigation?.ValorReferencia ?? "";

                                            // Aplicar lógica de valores por género/edad para Química Sanguínea
                                            if (nombreParametro.ToUpper().Contains("CREATININA"))
                                            {
                                                if (edad < 10) // Niños menores de 10 años
                                                {
                                                    valorReferencia = "0.3 - 0.7 mg/dL";
                                                }
                                                else if (edad >= 10 && edad < 18) // Niños de 10 a 17 años
                                                {
                                                    valorReferencia = "0.7 - 1.4 mg/dL";
                                                }
                                                else if (generoPaciente == "F") // Mujeres adultas (18+)
                                                {
                                                    valorReferencia = "0.6 - 1.1 mg/dL";
                                                }
                                                else // Hombres adultos (18+)
                                                {
                                                    valorReferencia = "0.7 - 1.4 mg/dL";
                                                }
                                            }
                                            else if (nombreParametro.ToUpper().Contains("ÁCIDO ÚRICO") || nombreParametro.ToUpper().Contains("ACIDO URICO"))
                                            {
                                                if (generoPaciente == "F")
                                                    valorReferencia = "2.6 - 6.0 mg/dL";
                                                else
                                                    valorReferencia = "3.5 - 7.2 mg/dL";
                                            }
                                            else if (nombreParametro.ToUpper().Contains("TRANSAMINASA OXALACÉTICA") ||
                                                     nombreParametro.ToUpper().Contains("TGO") ||
                                                     nombreParametro.ToUpper().Contains("AST"))
                                            {
                                                if (generoPaciente == "F")
                                                    valorReferencia = "Menor de 31 U/L";
                                                else
                                                    valorReferencia = "Menor de 35 U/L";
                                            }
                                            else if (nombreParametro.ToUpper().Contains("TRANSAMINASA PIRÚVICA") ||
                                                     nombreParametro.ToUpper().Contains("TGP") ||
                                                     nombreParametro.ToUpper().Contains("ALT"))
                                            {
                                                if (generoPaciente == "F")
                                                    valorReferencia = "Menor de 31 U/L";
                                                else
                                                    valorReferencia = "Menor de 41 U/L";
                                            }
                                            else if (nombreParametro.ToUpper().Contains("LDH"))
                                            {
                                                if (generoPaciente == "F")
                                                    valorReferencia = "Menor de 247 U/L";
                                                else
                                                    valorReferencia = "Menor de 248 U/L";
                                            }

                                            resultsTable.Cell().Element(ResultadoStyle).Text(nombreParametro).FontSize(12);
                                            resultsTable.Cell().Element(ResultadoStyle).Text(text =>
                                            {
                                                bool esValorAnormal = IsResultOutOfReferenceRange(
                                                    resultado.Resultado ?? "",
                                                    valorReferencia,
                                                    "QUÍMICA SANGUÍNEA"
                                                );
                                                if (esValorAnormal)
                                                {
                                                    text.Span(resultado.Resultado ?? "").Bold().FontColor(Colors.Black).FontSize(12);
                                                }
                                                else
                                                {
                                                    text.Span(resultado.Resultado ?? "").FontSize(12);
                                                }
                                            });
                                            resultsTable.Cell().Element(ResultadoStyle).AlignLeft().PaddingLeft(-40).Text(resultado.IdparametroNavigation?.UnidadMedida ?? "").FontSize(12);
                                            resultsTable.Cell().Element(ResultadoStyle).Text(valorReferencia).FontSize(12);
                                        }
                                    });
                                }

                                // Mostrar notas solo si existe el parámetro exacto "Glicohemoglobina A1C"
                                if (tieneGlicohemoglobina)
                                {
                                    column.Item().PaddingTop(12).AlignCenter().Column(col =>
                                    {
                                        col.Item().Text(text =>
                                        {
                                            text.Span("VALORES DE REFERENCIA").Bold();
                                        });

                                        col.Item().PaddingLeft(10).Text(text =>
                                        {
                                            text.Span("- 4.5 a 5.6     Paciente no Diabético").FontSize(10);
                                        });

                                        col.Item().PaddingLeft(10).Text(text =>
                                        {
                                            text.Span("- 5.7 a 6.0     Riesgo de desarrollar Diabetes").FontSize(10);
                                        });

                                        col.Item().PaddingLeft(10).Text(text =>
                                        {
                                            text.Span("- 6.1 a 6.5     Alto riesgo de desarrollar Diabetes").FontSize(10);
                                        });

                                        col.Item().PaddingLeft(10).Text(text =>
                                        {
                                            text.Span("- Paciente diabético, mal controlado o con metabolismo desequilibrado mayor de 8.5%").FontSize(10);
                                        });
                                    });
                                }
                            }
                            else if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("SEROLOGÍA"))
                            {
                                var listaResultados = resultadosFiltrados.ToList();
                                var resultadosPorPagina = new List<List<ResultadoExaman>>();
                                int resultadosPorPaginaCount = 15;

                                for (int i = 0; i < listaResultados.Count; i += resultadosPorPaginaCount)
                                {
                                    resultadosPorPagina.Add(listaResultados
                                        .Skip(i)
                                        .Take(resultadosPorPaginaCount)
                                        .ToList());
                                }

                                for (int i = 0; i < resultadosPorPagina.Count; i++)
                                {
                                    var resultadosPagina = resultadosPorPagina[i];

                                    if (i == 0)
                                    {
                                        column.Item().Table(headerTable =>
                                        {
                                            headerTable.ColumnsDefinition(columns =>
                                            {
                                                columns.RelativeColumn(3);     // ANÁLISIS
                                                columns.RelativeColumn(1.3f);  // RESULTADO
                                                columns.RelativeColumn(1);     // UNIDAD DE MEDIDA (vacío en algunos casos)
                                                columns.RelativeColumn(2.5f);  // VALORES DE REFERENCIA
                                            });

                                            headerTable.Header(header =>
                                            {
                                                header.Cell().Element(CellStyle).AlignLeft().Text("      ANÁLISIS").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                header.Cell().Element(CellStyle).AlignLeft().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                header.Cell().Element(CellStyle).Text("").Bold().FontColor(Colors.White);
                                                header.Cell().Element(CellStyle).AlignLeft().Text("VALORES DE REFERENCIA").Bold().FontColor(Colors.White).FontSize(12.5f);
                                            });

                                            if (!string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                            {
                                                headerTable.Cell().ColumnSpan(4)
                                                    .PaddingVertical(2)
                                                    .Element(DescripcionStyle)
                                                    .Text(detalleOrden.IdtipoExamenNavigation.Descripcion)
                                                    .Bold()
                                                    .FontSize(12);
                                            }
                                        });
                                    }

                                    column.Item().Table(resultsTable =>
                                    {
                                        resultsTable.ColumnsDefinition(columns =>
                                        {
                                            columns.RelativeColumn(3);
                                            columns.RelativeColumn(1.3f);
                                            columns.RelativeColumn(1);
                                            columns.RelativeColumn(2.5f);
                                        });

                                        string currentSubtitulo = null;
                                        foreach (var resultado in resultadosPagina)
                                        {
                                            var subtitulo = resultado.IdparametroNavigation?.Subtitulo;
                                            if (subtitulo != currentSubtitulo && !string.IsNullOrEmpty(subtitulo))
                                            {
                                                resultsTable.Cell().ColumnSpan(4)
                                                    .PaddingVertical(2)
                                                    .Element(SubtituloStyle)
                                                    .Text(subtitulo)
                                                    .Bold()
                                                    .FontSize(12);
                                                currentSubtitulo = subtitulo;
                                            }

                                            var nombreParametro = resultado.NombreParametro ?? "";
                                            var valorResultado = resultado.Resultado ?? "";
                                            var valorReferencia = resultado.IdparametroNavigation?.ValorReferencia ?? "";

                                            // Nombre del parámetro
                                            resultsTable.Cell().Element(ResultadoStyle).Text(nombreParametro).FontSize(12);

                                            // Resultado (negrita si es anormal)
                                            bool esValorAnormal = IsResultOutOfReferenceRange(valorResultado, valorReferencia, "SEROLOGÍA");
                                            resultsTable.Cell().Element(ResultadoStyle).Text(text =>
                                            {
                                                if (esValorAnormal)
                                                    text.Span(valorResultado).Bold().FontColor(Colors.Black).FontSize(12);
                                                else
                                                    text.Span(valorResultado).FontSize(12);
                                            });

                                            // Unidad de medida (puede ir vacío si no aplica)
                                            resultsTable.Cell().Element(ResultadoStyle).PaddingLeft(-20).Text(resultado.IdparametroNavigation?.UnidadMedida ?? "").FontSize(12);

                                            // Valor de referencia
                                            resultsTable.Cell().Element(ResultadoStyle).Text(valorReferencia).FontSize(12);
                                        }
                                    });
                                }
                            }
                            else if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("CITOLOGÍA FECAL"))
                            {
                                // Estilo especial para Citología Fecal con más espacio vertical pero sin bordes
                                Func<IContainer, IContainer> CeldaAltaStyle = cell => cell
                                    .PaddingVertical(10)  // Aumentamos el espacio vertical (antes era ~5)
                                    .PaddingHorizontal(5);

                                var listaResultados = resultadosFiltrados.ToList();
                                var resultadosPorPagina = new List<List<ResultadoExaman>>();
                                int resultadosPorPaginaCount = 10;  // Reducir un poco por el mayor espacio

                                for (int i = 0; i < listaResultados.Count; i += resultadosPorPaginaCount)
                                {
                                    resultadosPorPagina.Add(listaResultados
                                        .Skip(i)
                                        .Take(resultadosPorPaginaCount)
                                        .ToList());
                                }

                                for (int i = 0; i < resultadosPorPagina.Count; i++)
                                {
                                    var resultadosPagina = resultadosPorPagina[i];

                                    if (i == 0)
                                    {
                                        column.Item().Table(headerTable =>
                                        {
                                            headerTable.ColumnsDefinition(columns =>
                                            {
                                                columns.RelativeColumn(3);     // ANÁLISIS
                                                columns.RelativeColumn(1.3f);  // RESULTADO
                                                columns.RelativeColumn(1);     // UNIDAD DE MEDIDA
                                                columns.RelativeColumn(2.5f);  // VALORES DE REFERENCIA
                                            });

                                            headerTable.Header(header =>
                                            {
                                                header.Cell().Background("#0E5460").AlignLeft().Text("      ANÁLISIS").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                header.Cell().Background("#0E5460").AlignLeft().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                header.Cell().Background("#0E5460").Text("").Bold().FontColor(Colors.White);
                                                header.Cell().Background("#0E5460").AlignLeft().Text("VALORES DE REFERENCIA").Bold().FontColor(Colors.White).FontSize(12.5f);
                                            });

                                            if (!string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                            {
                                                headerTable.Cell().ColumnSpan(4)
                                                    .PaddingVertical(10)  // Más espacio para la descripción
                                                    .Element(DescripcionStyleSinBordes)
                                                    .Text(detalleOrden.IdtipoExamenNavigation.Descripcion)
                                                    .Bold()
                                                    .FontSize(12);
                                            }
                                        });
                                    }

                                    column.Item().Table(resultsTable =>
                                    {
                                        resultsTable.ColumnsDefinition(columns =>
                                        {
                                            columns.RelativeColumn(3);
                                            columns.RelativeColumn(1.3f);
                                            columns.RelativeColumn(1);
                                            columns.RelativeColumn(2.5f);
                                        });

                                        string currentSubtitulo = null;
                                        foreach (var resultado in resultadosPagina)
                                        {
                                            var subtitulo = resultado.IdparametroNavigation?.Subtitulo;
                                            if (subtitulo != currentSubtitulo && !string.IsNullOrEmpty(subtitulo))
                                            {
                                                resultsTable.Cell().ColumnSpan(4)
                                                    .PaddingVertical(10)  // Más espacio para subtítulos
                                                    .Element(SubtituloStyleSinBordes)
                                                    .Text(subtitulo)
                                                    .Bold()
                                                    .FontSize(12);
                                                currentSubtitulo = subtitulo;
                                            }

                                            // Aplicar el estilo con más espacio vertical
                                            resultsTable.Cell().Element(CeldaAltaStyle).Text(resultado.NombreParametro ?? "").FontSize(12);
                                            resultsTable.Cell().Element(CeldaAltaStyle).Text(resultado.Resultado ?? "").FontSize(12);
                                            resultsTable.Cell().Element(CeldaAltaStyle).Text(resultado.IdparametroNavigation?.UnidadMedida ?? "").FontSize(12);
                                            resultsTable.Cell().Element(CeldaAltaStyle).Text(resultado.IdparametroNavigation?.ValorReferencia ?? "").FontSize(12);
                                        }
                                    });
                                }
                            }
                            else if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("COAGULACIÓN"))
                            {
                                var listaResultados = resultadosFiltrados.ToList();
                                var resultadosPorPagina = new List<List<ResultadoExaman>>();
                                int resultadosPorPaginaCount = 15;

                                for (int i = 0; i < listaResultados.Count; i += resultadosPorPaginaCount)
                                {
                                    resultadosPorPagina.Add(listaResultados
                                        .Skip(i)
                                        .Take(resultadosPorPaginaCount)
                                        .ToList());
                                }

                                for (int i = 0; i < resultadosPorPagina.Count; i++)
                                {
                                    var resultadosPagina = resultadosPorPagina[i];

                                    if (i == 0)
                                    {
                                        column.Item().Table(headerTable =>
                                        {
                                            headerTable.ColumnsDefinition(columns =>
                                            {
                                                columns.RelativeColumn(3);     // ANÁLISIS
                                                columns.RelativeColumn(1.8f);  // RESULTADO
                                                columns.RelativeColumn(2.4f);  // VALORES DE REFERENCIA
                                            });

                                            headerTable.Header(header =>
                                            {
                                                header.Cell().Element(CellStyle).AlignLeft().Text("      ANÁLISIS").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                header.Cell().Element(CellStyle).AlignLeft().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                header.Cell().Element(CellStyle).AlignLeft().Text("VALORES DE REFERENCIA").Bold().FontColor(Colors.White).FontSize(12.5f);
                                            });

                                            if (!string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                            {
                                                headerTable.Cell().ColumnSpan(3)
                                                    .PaddingVertical(2)
                                                    .Element(DescripcionStyle)
                                                    .Text(detalleOrden.IdtipoExamenNavigation.Descripcion)
                                                    .Bold()
                                                    .FontSize(12);
                                            }
                                        });
                                    }

                                    column.Item().Table(resultsTable =>
                                    {
                                        resultsTable.ColumnsDefinition(columns =>
                                        {
                                            columns.RelativeColumn(3);
                                            columns.RelativeColumn(1.8f);
                                            columns.RelativeColumn(2.4f);
                                        });

                                        string currentSubtitulo = null;
                                        foreach (var resultado in resultadosPagina)
                                        {
                                            var subtitulo = resultado.IdparametroNavigation?.Subtitulo;
                                            if (subtitulo != currentSubtitulo && !string.IsNullOrEmpty(subtitulo))
                                            {
                                                resultsTable.Cell().ColumnSpan(3)
                                                    .PaddingVertical(2)
                                                    .Element(SubtituloStyle)
                                                    .Text(subtitulo)
                                                    .Bold()
                                                    .FontSize(12);
                                                currentSubtitulo = subtitulo;
                                            }

                                            var nombreParametro = resultado.NombreParametro ?? "";
                                            var valorResultado = resultado.Resultado ?? "";
                                            var valorReferencia = resultado.IdparametroNavigation?.ValorReferencia ?? "";

                                            // Nombre del parámetro
                                            resultsTable.Cell().Element(ResultadoStyle).Text(nombreParametro).FontSize(12);

                                            // Resultado centrado
                                            resultsTable.Cell().Element(ResultadoStyle).Text(valorResultado).FontSize(12);

                                            // Valor de referencia
                                            resultsTable.Cell().Element(ResultadoStyle).Text(valorReferencia).FontSize(12);
                                        }
                                    });
                                }
                            }
                            else if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("UROCULTIVO"))
                            {
                                // Verificar si es un urocultivo negativo:
                                // 1. Si hay un parámetro llamado "OBSERVACION" o "NOTA"
                                // 2. O si todos los parámetros están vacíos (excepto posibles notas)
                                bool esUrocultivoNegativo = resultadosFiltrados.Any(r =>
                                    r.NombreParametro != null &&
                                    (r.NombreParametro.Equals("OBSERVACION", StringComparison.OrdinalIgnoreCase) ||
                                     r.NombreParametro.Equals("NOTA", StringComparison.OrdinalIgnoreCase))) ||
                                   !resultadosFiltrados.Any(r =>
                                       !string.IsNullOrWhiteSpace(r.Resultado) &&
                                       r.NombreParametro != null &&
                                       !r.NombreParametro.Equals("OBSERVACION", StringComparison.OrdinalIgnoreCase) &&
                                       !r.NombreParametro.Equals("NOTA", StringComparison.OrdinalIgnoreCase));

                                if (esUrocultivoNegativo)
                                {
                                    // Mostrar formato de UROCULTIVO NEGATIVO
                                    column.Item().PaddingTop(15).AlignCenter().Column(centeredColumn =>
                                    {
                                        centeredColumn.Item().PaddingBottom(10).Text(text =>
                                        {
                                            text.Span("RESULTADO").Bold().FontSize(12);
                                        });

                                        centeredColumn.Item().PaddingBottom(20).AlignCenter().Text(text =>
                                        {
                                            text.Span("NO HUBO CRECIMIENTO BACTERIANO EN 48 HORAS DE INCUBACIÓN.").FontSize(12);
                                        });

                                        // Mostrar la NOTA personalizada si existe y no es solo un punto
                                        if (notaParametro != null && !string.IsNullOrWhiteSpace(notaParametro.Resultado))
                                        {
                                            string nota = notaParametro.Resultado.Trim();
                                            if (nota != ".")
                                            {
                                                centeredColumn.Item().PaddingBottom(10).Text(text =>
                                                {
                                                    text.Span("NOTA: ").Bold().FontSize(12);
                                                    text.Span(notaParametro.Resultado).FontSize(12);
                                                });
                                            }
                                        }

                                        // Agregar la nota estática
                                        centeredColumn.Item().PaddingTop(20).Text(text =>
                                        {
                                            text.Span("NOTA: ").Bold().FontSize(12);
                                            text.Span("Para un cultivo de orina apropiado, es esencial la recolección adecuada de la muestra y evitar la ingesta de antibiótico, ya que afecta directamente el resultado del urocultivo.").FontSize(14);
                                        });
                                    });
                                }
                                else
                                {
                                    // Mostrar formato de UROCULTIVO normal
                                    // Separar los 3 primeros parámetros (MICROORGANISMO AISLADO, CONTALE DE COLONIAS, BLEE)
                                    var parametrosEspeciales = resultadosFiltrados
                                        .Where(r => r.NombreParametro != null &&
                                               (r.NombreParametro.ToUpper().Contains("MICROORGANISMO AISLADO") ||
                                                r.NombreParametro.ToUpper().Contains("CONTAJE DE COLONIAS") ||
                                                r.NombreParametro.ToUpper().Contains("BLEE")))
                                        .OrderBy(r => r.Idparametro)
                                        .ToList();

                                    // Los demás parámetros van en la tabla de antibióticos
                                    var parametrosTabla = resultadosFiltrados
                                        .Where(r => !parametrosEspeciales.Contains(r))
                                        .ToList();

                                    // Mostrar los 3 parámetros especiales en una tabla con bordes
                                    column.Item().PaddingTop(10).Table(specialTable =>
                                    {
                                        specialTable.ColumnsDefinition(columns =>
                                        {
                                            columns.RelativeColumn(3); // Nombre del parámetro
                                            columns.RelativeColumn(2); // Resultado
                                        });


                                        foreach (var parametro in parametrosEspeciales)
                                        {
                                            specialTable.Cell().Element(CellContentStyle).Text(text =>
                                            {
                                                text.Span($"{parametro.NombreParametro?.ToUpper()}").Bold().FontSize(12);
                                            });

                                            // Formatear el resultado si es el parámetro "CONTAJE DE COLONIAS"
                                            string resultadoFormateado = parametro.Resultado ?? "";
                                            if (parametro.NombreParametro != null &&
                                                parametro.NombreParametro.ToUpper().Contains("CONTAJE DE COLONIAS") &&
                                                !string.IsNullOrWhiteSpace(resultadoFormateado))
                                            {
                                                // Reemplazar puntos por comas en los valores numéricos
                                                resultadoFormateado = resultadoFormateado
                                                    .Replace("20.000", "20,000")
                                                    .Replace("30.000", "30,000")
                                                    .Replace("50.000", "50,000")
                                                    .Replace("80.000", "80,000")
                                                    .Replace(">100.000", ">100,000");
                                            }

                                            specialTable.Cell().Element(CellContentStyle).Text(resultadoFormateado).FontSize(12);
                                        }
                                    });

                                    // Mostrar la descripción del examen si existe
                                    if (!string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                    {
                                        column.Item().PaddingTop(15).AlignCenter().Text(detalleOrden.IdtipoExamenNavigation.Descripcion).Bold().FontSize(12);
                                        column.Item().PaddingBottom(10); // Espacio adicional después de la descripción
                                    }

                                    // Mostrar la tabla de antibióticos
                                    column.Item().Table(table =>
                                    {
                                        table.ColumnsDefinition(columns =>
                                        {
                                            columns.RelativeColumn(3); // Antibiótico
                                            columns.RelativeColumn(2); // Resultado
                                        });

                                        // Encabezado de la tabla
                                        table.Header(header =>
                                        {
                                            header.Cell().Element(CellStyle).AlignLeft().Text("     Antibióticos").Bold().FontColor(Colors.White).FontSize(12.5f);
                                            header.Cell().Element(CellStyle).AlignLeft().Text("Resultados").Bold().FontColor(Colors.White).FontSize(12.5f);
                                        });

                                        // Filas de datos
                                        foreach (var resultado in parametrosTabla)
                                        {
                                            table.Cell().Element(ResultadoStyle).Text(resultado.NombreParametro ?? "").FontSize(12);
                                            table.Cell().Element(ResultadoStyle).Text(resultado.Resultado ?? "").FontSize(12);
                                        }
                                    });

                                    // NOTA INDEPENDIENTE PARA UROCULTIVO NORMAL
                                    column.Item().PaddingTop(20).Column(notaColumn =>
                                    {
                                        // Mostrar la NOTA personalizada si existe
                                        if (notaParametro != null && !string.IsNullOrWhiteSpace(notaParametro.Resultado))
                                        {
                                            notaColumn.Item().Text(text =>
                                            {
                                                text.Span("NOTA: ").Bold().FontSize(12);
                                                text.Span(notaParametro.Resultado).FontSize(12);
                                            });
                                        }
                                    });
                                }
                            }
                            // TABLA ESTÁNDAR
                            else
                            {
                                var listaResultados = resultadosFiltrados.ToList();
                                var resultadosPorPagina = new List<List<ResultadoExaman>>();
                                int resultadosPorPaginaCount = 15;

                                // Variable para rastrear si ya mostramos un subtítulo en páginas anteriores
                                string lastShownSubtitulo = null;

                                for (int i = 0; i < listaResultados.Count; i += resultadosPorPaginaCount)
                                {
                                    resultadosPorPagina.Add(listaResultados
                                        .Skip(i)
                                        .Take(resultadosPorPaginaCount)
                                        .ToList());
                                }

                                for (int i = 0; i < resultadosPorPagina.Count; i++)
                                {
                                    var resultadosPagina = resultadosPorPagina[i];

                                    if (i == 0)
                                    {
                                        column.Item().Table(headerTable =>
                                        {
                                            headerTable.ColumnsDefinition(columns =>
                                            {
                                                columns.RelativeColumn(3);
                                                columns.RelativeColumn(1.3f);
                                                columns.RelativeColumn(1);
                                                columns.RelativeColumn(2.5f);
                                            });

                                            headerTable.Header(header =>
                                            {
                                                header.Cell().Element(CellStyle).AlignLeft().Text("      ANÁLISIS").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                header.Cell().Element(CellStyle).AlignLeft().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                header.Cell().Element(CellStyle).Text("").Bold().FontColor(Colors.White);
                                                header.Cell().Element(CellStyle).AlignLeft().Text("VALORES DE REFERENCIA").Bold().FontColor(Colors.White).FontSize(12.5f);
                                            });

                                            if (!string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                            {
                                                headerTable.Cell().ColumnSpan(4)
                                                    .PaddingVertical(2)
                                                    .Element(DescripcionStyle)
                                                    .Text(detalleOrden.IdtipoExamenNavigation.Descripcion)
                                                    .Bold()
                                                    .FontSize(12);
                                            }
                                        });
                                    }

                                    column.Item().Table(resultsTable =>
                                    {
                                        resultsTable.ColumnsDefinition(columns =>
                                        {
                                            columns.RelativeColumn(3);
                                            columns.RelativeColumn(1.3f);
                                            columns.RelativeColumn(1);
                                            columns.RelativeColumn(2.5f);
                                        });

                                        string currentSubtitulo = null;
                                        foreach (var resultado in resultadosPagina)
                                        {
                                            var subtitulo = resultado.IdparametroNavigation?.Subtitulo;

                                            // Solo mostrar el subtítulo si es diferente al actual Y no ha sido mostrado antes
                                            if (subtitulo != currentSubtitulo && !string.IsNullOrEmpty(subtitulo) &&
                                                (lastShownSubtitulo == null || !subtitulo.Equals(lastShownSubtitulo)))
                                            {
                                                resultsTable.Cell().ColumnSpan(4)
                                                    .PaddingVertical(2)
                                                    .Element(SubtituloStyle)
                                                    .Text(subtitulo)
                                                    .Bold()
                                                    .FontSize(12);
                                                currentSubtitulo = subtitulo;
                                                lastShownSubtitulo = subtitulo;
                                            }

                                            // Verificar si es el parámetro "Cristales" o "Cilindros"
                                            bool esCristales = resultado.NombreParametro?.Contains("Cristales", StringComparison.OrdinalIgnoreCase) ?? false;
                                            bool esCilindros = resultado.NombreParametro?.Contains("Cilindros", StringComparison.OrdinalIgnoreCase) ?? false;
                                            bool esColor = resultado.NombreParametro?.Contains("Color", StringComparison.OrdinalIgnoreCase) ?? false;

                                            if (esCristales || esCilindros || esColor)
                                            {
                                                // Para Cristales o Cilindros: ocupar toda la línea
                                                resultsTable.Cell().Element(ResultadoStyle).Text(resultado.NombreParametro ?? "").FontSize(12);
                                                resultsTable.Cell().ColumnSpan(3).Element(ResultadoStyle).Text(resultado.Resultado ?? "").FontSize(12);
                                            }
                                            else
                                            {
                                                // Para otros parámetros: formato normal
                                                resultsTable.Cell().Element(ResultadoStyle).Text(resultado.NombreParametro ?? "").FontSize(12);
                                                resultsTable.Cell().Element(ResultadoStyle).Text(resultado.Resultado ?? "").FontSize(12);
                                                resultsTable.Cell().Element(ResultadoStyle).Text(resultado.IdparametroNavigation?.UnidadMedida ?? "").FontSize(12);
                                                resultsTable.Cell().Element(ResultadoStyle).Text(resultado.IdparametroNavigation?.ValorReferencia ?? "").FontSize(12);
                                            }
                                        }
                                    });
                                }
                            }

                            // Mostrar la NOTA si existe y solo para los exámenes específicos
                            if (notaParametro != null && !string.IsNullOrWhiteSpace(notaParametro.Resultado))
                            {
                                var nombreExamen = detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper();

                                // Excluir UROCULTIVO completamente
                                bool esUrocultivo = nombreExamen.Contains("UROCULTIVO");

                                if (!esUrocultivo &&
                                    (nombreExamen.Contains("HEMATOLOGÍA") ||
                                     nombreExamen.Contains("QUÍMICA SANGUÍNEA") ||
                                     // Para la tabla estándar, verifica que no sea ninguno de los otros formatos especiales
                                     (!nombreExamen.Contains("EXÁMENES DIVERSOS") &&
                                      !nombreExamen.Contains("PARASITOLOGÍA") &&
                                      !nombreExamen.Contains("SEROLOGÍA") &&
                                      !nombreExamen.Contains("CITOLOGÍA FECAL") &&
                                      !nombreExamen.Contains("COAGULACIÓN"))))
                                {
                                    column.Item().PaddingTop(10).Text(text =>
                                    {
                                        text.Span("NOTA: ").Bold();
                                        text.Span(notaParametro.Resultado);
                                    });
                                }
                            }

                        });
                    });
                });

                // Estilos
                static IContainer CellStyle(IContainer container)
                {
                    return container
                        .BorderBottom(1)
                        .Background("#0E5460")
                        .BorderColor(Colors.Black)
                        .PaddingVertical(1);
                }

                static IContainer DescripcionStyle(IContainer container)
                {
                    return container
                        .BorderBottom(1)
                        .BorderColor(Colors.Grey.Lighten2)
                        .PaddingVertical(0.5f)
                        .PaddingHorizontal(5);
                }

                static IContainer SubtituloStyle(IContainer container)
                {
                    return container
                        .BorderBottom(1)
                        .BorderColor(Colors.Grey.Lighten2)
                        .PaddingVertical(0.5f)
                        .PaddingHorizontal(5);
                }

                static IContainer ResultadoStyle(IContainer container)
                {
                    return container
                        .BorderBottom(1)
                        .BorderColor(Colors.Grey.Lighten2)
                        .PaddingVertical(0.5f)
                        .PaddingHorizontal(5);
                }

                static IContainer CellContentStyle(IContainer container)
                {
                    return container
                        .BorderBottom(1)
                        .BorderColor(Colors.Grey.Lighten2)
                        .PaddingVertical(0.5f)
                        .PaddingHorizontal(5);
                }
                static IContainer DescripcionStyleSinBordes(IContainer container)
                {
                    return container
                        .PaddingVertical(0.5f)
                        .PaddingHorizontal(5);
                }

                static IContainer SubtituloStyleSinBordes(IContainer container)
                {
                    return container
                        .PaddingVertical(0.5f)
                        .PaddingHorizontal(5);
                }

                static IContainer ResultadoStyleSinBordes(IContainer container)
                {
                    return container
                        .PaddingVertical(0.5f)
                        .PaddingHorizontal(5);
                }

                var pdfBytes = document.GeneratePdf();
                var nombreArchivo = $"Reporte_{detalleOrden.IdtipoExamenNavigation.NombreExamen.Replace(" ", "_")}_{detalleOrden.IdordenNavigation.IdclienteNavigation.Nombre?.Replace(" ", "_")}_{DateTime.Now:yyyyMMdd}.pdf";

                return File(pdfBytes, "application/pdf", nombreArchivo);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al generar el reporte: {ex.Message}");
            }
        }

        [HttpGet("generar-reporte-completo-firma/{idCliente}")]
        public async Task<IActionResult> GenerarReporteCompletoPacienteFirma(int idCliente)
        {
            try
            {
                var exePath = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
                var imagePath = Path.Combine(exePath, "img", "logo.jpeg");
                byte[] imageBytes = System.IO.File.ReadAllBytes(imagePath);

                // Obtener todas las órdenes completas del paciente con sus exámenes (ordenadas por fecha descendente)
                var ordenes = await _context.Ordens
                    .Include(o => o.IdclienteNavigation)
                    .Include(o => o.IdmedicoNavigation)
                    .Include(o => o.DetalleOrdens)
                        .ThenInclude(d => d.IdtipoExamenNavigation)
                    .Include(o => o.DetalleOrdens)
                        .ThenInclude(d => d.ResultadoExamen)
                            .ThenInclude(r => r.IdparametroNavigation)
                    .Where(o => o.Idcliente == idCliente && o.Estado == "COMPLETADO")
                    .OrderByDescending(o => o.FechaOrden)
                    .ToListAsync();

                if (ordenes == null || !ordenes.Any())
                    return NotFound("No se encontraron exámenes con resultados para este paciente");

                // Obtener datos del cliente
                var paciente = ordenes.First().IdclienteNavigation;
                var edad = paciente.FechaNacimiento.HasValue ?
                    DateTime.Now.Year - paciente.FechaNacimiento.Value.Year : 0;

                // Generar PDF
                var document = Document.Create(container =>
                {
                    // Estilos reutilizables
                    Func<IContainer, IContainer> CellStyle = cell => cell
                        .BorderBottom(1)
                        .Background("#0E5460")
                        .BorderColor(Colors.Black)
                        .PaddingVertical(1);

                    Func<IContainer, IContainer> DescripcionStyle = desc => desc
                        .BorderBottom(1)
                        .BorderColor(Colors.Grey.Lighten2)
                        .PaddingHorizontal(5);

                    Func<IContainer, IContainer> SubtituloStyle = sub => sub
                        .BorderBottom(1)
                        .BorderColor(Colors.Grey.Lighten2)
                        .PaddingHorizontal(5);

                    Func<IContainer, IContainer> ResultadoStyle = res => res
                        .BorderBottom(1)
                        .BorderColor(Colors.Grey.Lighten2)
                        .PaddingVertical(0.5f)
                        .PaddingHorizontal(5);

                    Func<IContainer, IContainer> CellContentStyle = cell => cell
                        .BorderBottom(1)
                        .BorderColor(Colors.Grey.Lighten2)
                        .PaddingVertical(0.5f)
                        .PaddingHorizontal(5);
                    static IContainer DescripcionStyleSinBordes(IContainer container)
                    {
                        return container
                            .PaddingVertical(0.5f)
                            .PaddingHorizontal(5);
                    }

                    static IContainer SubtituloStyleSinBordes(IContainer container)
                    {
                        return container
                            .PaddingVertical(0.5f)
                            .PaddingHorizontal(5);
                    }

                    static IContainer ResultadoStyleSinBordes(IContainer container)
                    {
                        return container
                            .PaddingVertical(0.5f)
                            .PaddingHorizontal(5);
                    }


                    // Configuración de página
                    container.Page(page =>
                    {
                        page.Size(PageSizes.A4);
                        page.Margin(30);
                        page.DefaultTextStyle(x => x.FontSize(10).FontFamily("Times New Roman"));

                        // Encabezado
                        page.Header().Column(column =>
                        {
                            column.Item().Row(row =>
                            {
                                row.RelativeItem(1).AlignLeft().Image(imageBytes, ImageScaling.FitWidth);
                                row.RelativeItem(3).Column(textColumn =>
                                {
                                    textColumn.Item().AlignCenter().Text("Laboratorio Clínico").Bold().Italic().FontSize(20).FontColor("#1F3864");
                                    textColumn.Item().AlignCenter().Text("Sangre de Cristo").Bold().Italic().FontSize(20).FontColor("#1F3864");
                                    textColumn.Item().AlignCenter().Text("Lic. Miurell Gutiérrez Rivera").Italic().FontSize(12).FontColor("#1F3864");
                                    textColumn.Item().AlignCenter().Text("Lic. Alvaro Bracamonte Nicaragua").Italic().FontSize(12).FontColor("#1F3864");
                                });
                                row.RelativeItem(1);
                            });

                            column.Item().PaddingTop(5).LineHorizontal(1).LineColor(Colors.Grey.Medium);
                            column.Item().PaddingVertical(10);
                        });

                        // Pie de página
                        page.Footer().Column(column =>
                        {
                            column.Item().PaddingBottom(5).AlignRight().Text("Valído: Lic. Miurell Gutiérrez Rivera").FontSize(10);
                            column.Item().PaddingBottom(25);
                            column.Item().PaddingTop(10).AlignCenter().Text("Tu confianza, es nuestra satisfacción").Bold().Italic().FontColor("#1F3864");
                            column.Item().PaddingBottom(20);
                            column.Item().AlignCenter().Text("Dirección: Casa natal de Rubén Darío 4 Cuadras al este, Ciudad Darío, Matagalpa.").Italic();
                            column.Item().AlignCenter().Text("Cel: 85052997").Italic();
                            column.Item().AlignCenter().Text("Correo electrónico: Labsandecris@gmail.com").Italic();
                        });

                        // Contenido
                        page.Content().Column(column =>
                        {
                            bool datosPacienteMostradosEnPagina = false;
                            (int columns, List<string> headers)? tablaAnterior = null;
                            int? ordenActual = null;
                            bool esPrimerExamenEnPagina = true;

                            foreach (var orden in ordenes)
                            {
                                var examenesEnOrden = orden.DetalleOrdens
                                    .Where(d => d.ResultadoExamen.Any(r => !string.IsNullOrWhiteSpace(r.Resultado)))
                                    .OrderBy(d => d.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("EXÁMENES DIVERSOS") ? 1 : 0)
                                    .ThenBy(d => d.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("COAGULACIÓN") ? 1 : 0)
                                    .ThenBy(d => EsExamenPequeno(d) ? 1 : 0) // Luego pequeños
                                    .ThenBy(d => d.IddetalleOrden)
                                    .ToList();

                                if (!examenesEnOrden.Any())
                                    continue;

                                // Función para determinar si un examen es pequeño (8 o menos parámetros)
                                bool EsExamenPequeno(DetalleOrden detalle)
                                {
                                    return detalle.ResultadoExamen.Count(r => !string.IsNullOrWhiteSpace(r.Resultado)) <= 8;
                                }

                                // Calcular altura total de los exámenes en esta orden
                                int alturaTotal = examenesEnOrden.Sum(e => e.ResultadoExamen.Count(r => !string.IsNullOrWhiteSpace(r.Resultado)));
                                bool puedenCaberEnUnaPagina = alturaTotal <= 25 && examenesEnOrden.Count > 1;

                                // Procesar cada examen en la orden
                                for (int i = 0; i < examenesEnOrden.Count; i++)
                                {
                                    var detalleOrden = examenesEnOrden[i];
                                    bool esPrimerExamenEnOrden = i == 0;
                                    bool esUltimoExamenEnOrden = i == examenesEnOrden.Count - 1;
                                    bool examenActualEsPequeno = EsExamenPequeno(detalleOrden);
                                    bool proximoExamenEsPequeno = !esUltimoExamenEnOrden && EsExamenPequeno(examenesEnOrden[i + 1]);

                                    // Determinar si podemos agrupar exámenes pequeños
                                    bool agruparConSiguiente = examenActualEsPequeno && proximoExamenEsPequeno;

                                    var (currentColumns, currentHeaders) = DeterminarTipoTabla(
                                        detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper(),
                                        esPrimerExamenEnOrden,
                                        puedenCaberEnUnaPagina,
                                        esPrimerExamenEnPagina);

                                    bool esMismaTabla = tablaAnterior.HasValue &&
                                                        currentColumns == tablaAnterior.Value.columns &&
                                                        currentHeaders.SequenceEqual(tablaAnterior.Value.headers);

                                    // Mostrar datos del paciente solo si es necesario
                                    if (orden.Idorden != ordenActual || !datosPacienteMostradosEnPagina)
                                    {
                                        column.Item().Row(row =>
                                        {
                                            row.RelativeItem().Text(text =>
                                            {
                                                text.Span("Paciente: ").Bold().FontSize(12.5f);
                                                text.Span($"{paciente.Nombre ?? "N/A"}").FontSize(12.5f);
                                            });

                                            row.RelativeItem().AlignRight().Text(text =>
                                            {
                                                text.Span("Sexo - Edad: ").Bold().FontSize(12.5f);
                                                text.Span($"{FormatearGenero(paciente.Genero)} - {edad} Años").FontSize(12.5F);
                                            });
                                        });

                                        column.Item().Row(row =>
                                        {
                                            row.RelativeItem().Text(text =>
                                            {
                                                text.Span("Médico: ").Bold().FontSize(12.5f);
                                                text.Span(orden.IdmedicoNavigation?.Nombre ?? "N/A").FontSize(12.5f);
                                            });

                                            row.RelativeItem().AlignRight().Text(text =>
                                            {
                                                text.Span("Núm. Muestra: ").Bold().FontSize(12.5F);
                                                text.Span(orden.NumeroMuestra.ToString()).FontSize(12.5F);
                                            });
                                        });

                                        column.Item().Row(row =>
                                        {
                                            row.RelativeItem().Text(text =>
                                            {
                                                text.Span("Mx Recepcionado: ").Bold().FontSize(12.5f);
                                                text.Span(orden.FechaOrden?.ToString("dd/MM/yyyy")).FontSize(12.5f);
                                            });

                                            row.RelativeItem().AlignRight().Text(text =>
                                            {
                                                text.Span("Emisión de resultado: ").Bold().FontSize(12.5f);
                                                text.Span(orden.FechaEntrega?.ToString("dd/MM/yyyy") ?? "N/A").FontSize(12.5f);
                                            });
                                        });

                                        datosPacienteMostradosEnPagina = true;
                                        ordenActual = orden.Idorden;
                                    }

                                    // Título del examen
                                    var tituloExamen = detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("CITOLOGÍA FECAL") ||
                                                       detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("TINCION WRIGTH")
                                        ? "PARASITOLOGÍA"
                                        : detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper();


                                    column.Item().PaddingTop(esPrimerExamenEnPagina ? 15 : 15).AlignCenter()
                                        .Text(tituloExamen)
                                        .Bold().FontSize(14);
                                    column.Item().PaddingBottom(20);

                                    var resultadosFiltrados = detalleOrden.ResultadoExamen
                                        .Where(r => !string.IsNullOrWhiteSpace(r.Resultado))
                                        .OrderBy(r => string.IsNullOrEmpty(r.IdparametroNavigation?.Subtitulo) ? 0 : 1)
                                        .ThenBy(r => r.Idparametro)
                                        .ThenBy(r => r.IdparametroNavigation?.Subtitulo)
                                        .ToList();

                                    // Detectar y filtrar parámetro NOTA
                                    var notaParametro = resultadosFiltrados.FirstOrDefault(r =>
                                        r.NombreParametro != null &&
                                        r.NombreParametro.Equals("NOTA", StringComparison.OrdinalIgnoreCase));

                                    // Filtrar el parámetro NOTA de los resultados que van en la tabla
                                    resultadosFiltrados = resultadosFiltrados
                                        .Where(r => r.NombreParametro == null ||
                                               !r.NombreParametro.Equals("NOTA", StringComparison.OrdinalIgnoreCase))
                                        .ToList();

                                    // EXÁMENES DIVERSOS
                                    if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("EXÁMENES DIVERSOS"))
                                    {
                                        var listaResultados = resultadosFiltrados.ToList();
                                        var resultadosPorPagina = new List<List<ResultadoExaman>>();
                                        int resultadosPorPaginaCount = 15;

                                        // Primero separamos los datos en las 3 categorías
                                        var muestras = listaResultados
                                            .Where(r => r.NombreParametro != null && r.NombreParametro.ToUpper().Contains("MUESTRA"))
                                            .OrderBy(r => r.Idparametro)
                                            .ToList();

                                        var examenes = listaResultados
                                            .Where(r => r.NombreParametro != null &&
                                                   !r.NombreParametro.ToUpper().Contains("MUESTRA") &&
                                                   !r.NombreParametro.ToUpper().Contains("RESULTADO") &&
                                                   !r.NombreParametro.ToUpper().Contains("DIAGNÓSTICO"))
                                            .OrderBy(r => r.Idparametro)
                                            .ToList();

                                        var resultados = listaResultados
                                            .Where(r => r.NombreParametro != null &&
                                                   (r.NombreParametro.ToUpper().Contains("RESULTADO") ||
                                                    r.NombreParametro.ToUpper().Contains("DIAGNÓSTICO")))
                                            .OrderBy(r => r.Idparametro)
                                            .ToList();

                                        // Creamos una lista combinada ordenada
                                        var listaCombinada = new List<ResultadoExaman>();
                                        int maxCount = new[] { muestras.Count, examenes.Count, resultados.Count }.Max();

                                        for (int j = 0; j < maxCount; j++)
                                        {
                                            if (j < muestras.Count) listaCombinada.Add(muestras[j]);
                                            if (j < examenes.Count) listaCombinada.Add(examenes[j]);
                                            if (j < resultados.Count) listaCombinada.Add(resultados[j]);
                                        }

                                        // Paginamos la lista combinada
                                        for (int j = 0; j < listaCombinada.Count; j += resultadosPorPaginaCount)
                                        {
                                            resultadosPorPagina.Add(listaCombinada
                                                .Skip(j)
                                                .Take(resultadosPorPaginaCount)
                                                .ToList());
                                        }

                                        for (int j = 0; j < resultadosPorPagina.Count; j++)
                                        {
                                            var resultadosPagina = resultadosPorPagina[j];

                                            column.Item().Table(diversosTable =>
                                            {
                                                diversosTable.ColumnsDefinition(columns =>
                                                {
                                                    columns.RelativeColumn(3);
                                                    columns.RelativeColumn(4);
                                                    columns.RelativeColumn(3);
                                                });

                                                if (j == 0)
                                                {
                                                    diversosTable.Header(header =>
                                                    {
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("     MUESTRA").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                        header.Cell().Element(CellStyle).AlignCenter().Text("EXAMEN").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                        header.Cell().Element(CellStyle).AlignCenter().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                    });
                                                }

                                                // Procesamos en grupos de 3 (muestra, examen, resultado)
                                                for (int k = 0; k < resultadosPagina.Count; k += 3)
                                                {
                                                    var muestra = resultadosPagina[k];
                                                    var examen = k + 1 < resultadosPagina.Count ? resultadosPagina[k + 1] : null;
                                                    var resultado = k + 2 < resultadosPagina.Count ? resultadosPagina[k + 2] : null;

                                                    // Verificamos los tipos para asegurarnos de que están en la columna correcta
                                                    if (muestra != null && !muestra.NombreParametro.ToUpper().Contains("MUESTRA"))
                                                    {
                                                        // Si no es muestra, rotamos los valores
                                                        var temp = muestra;
                                                        muestra = examen;
                                                        examen = resultado;
                                                        resultado = temp;
                                                    }

                                                    diversosTable.Cell().Element(CellContentStyle).PaddingHorizontal(12).AlignLeft()
                                                        .Text(muestra?.Resultado ?? "").FontSize(12);
                                                    diversosTable.Cell().Element(CellContentStyle).AlignCenter()
                                                        .Text(examen?.NombreParametro ?? examen?.Resultado ?? "").FontSize(12);
                                                    diversosTable.Cell().Element(CellContentStyle).AlignCenter()
                                                        .Text(resultado?.Resultado ?? "").FontSize(12);
                                                }
                                            });
                                        }
                                    }
                                    else if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("PARASITOLOGÍA"))
                                    {
                                        // Primero mostramos la tabla estándar para otros parámetros
                                        var parametrosNormales = resultadosFiltrados
                                            .Where(r => r.NombreParametro != null &&
                                                   !r.NombreParametro.ToUpper().Contains("MUESTRA") &&
                                                   !r.NombreParametro.ToUpper().Contains("EXAMEN") &&
                                                   !r.NombreParametro.ToUpper().Contains("RESULTADO") &&
                                                   !r.NombreParametro.ToUpper().Contains("HELICOBACTER PYLORI") &&
                                                   !r.NombreParametro.ToUpper().Contains("SANGRE OCULTA (FOB)"))
                                            .ToList();

                                        if (parametrosNormales.Any())
                                        {
                                            column.Item().Table(table =>
                                            {
                                                table.ColumnsDefinition(columns =>
                                                {
                                                    columns.RelativeColumn(2.5f); // Parámetro
                                                    columns.RelativeColumn(4); // Resultado
                                                });

                                                // Solo mostrar encabezado si es el primer examen en la orden
                                                if (!esMismaTabla && (esPrimerExamenEnOrden || esPrimerExamenEnPagina))
                                                {
                                                    table.Header(header =>
                                                    {
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("      ANÁLISIS").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                    });
                                                }

                                                // Agregar descripción si existe
                                                if (!string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                                {
                                                    table.Cell().ColumnSpan(2)
                                                        .PaddingVertical(2)
                                                        .Element(DescripcionStyle)
                                                        .Text(detalleOrden.IdtipoExamenNavigation.Descripcion)
                                                        .Bold()
                                                        .FontSize(12);
                                                }

                                                string currentSubtitulo = null;
                                                foreach (var resultado in parametrosNormales)
                                                {
                                                    var subtitulo = resultado.IdparametroNavigation?.Subtitulo;
                                                    if (subtitulo != currentSubtitulo && !string.IsNullOrEmpty(subtitulo))
                                                    {
                                                        table.Cell().ColumnSpan(2)
                                                            .PaddingVertical(2)
                                                            .Element(SubtituloStyle)
                                                            .Text(subtitulo)
                                                            .Bold()
                                                            .FontSize(12);
                                                        currentSubtitulo = subtitulo;
                                                    }

                                                    table.Cell().Element(ResultadoStyle).Text(resultado.NombreParametro ?? "").FontSize(12);
                                                    table.Cell().Element(ResultadoStyle).Text(resultado.Resultado ?? "").FontSize(12);
                                                }
                                            });
                                        }

                                        // Tabla especial MUESTRA/EXAMEN/RESULTADO para Parasitología
                                        var muestras = resultadosFiltrados
                                            .Where(r => r.NombreParametro != null && r.NombreParametro.ToUpper().Contains("MUESTRA"))
                                            .OrderBy(r => r.NombreParametro)
                                            .ToList();

                                        var examenesEspeciales = resultadosFiltrados
                                            .Where(r => r.NombreParametro != null &&
                                                   (r.NombreParametro.ToUpper().Contains("HELICOBACTER PYLORI") ||
                                                    r.NombreParametro.ToUpper().Contains("SANGRE OCULTA (FOB)")))
                                            .OrderBy(r => r.NombreParametro)
                                            .ToList();

                                        var resultadosEspeciales = resultadosFiltrados
                                            .Where(r => r.NombreParametro != null && r.NombreParametro.ToUpper().Contains("RESULTADO"))
                                            .OrderBy(r => r.NombreParametro)
                                            .ToList();

                                        // Mostrar tabla especial si tenemos al menos un conjunto completo
                                        if (muestras.Any() && examenesEspeciales.Any() && resultadosEspeciales.Any())
                                        {
                                            column.Item().PaddingTop(10).Table(parasitologiaTable =>
                                            {
                                                parasitologiaTable.ColumnsDefinition(columns =>
                                                {
                                                    columns.RelativeColumn(2);
                                                    columns.RelativeColumn(3);
                                                    columns.RelativeColumn(2);
                                                });

                                                // Solo mostrar encabezado si es el primer examen en la orden
                                                if (!esMismaTabla && (esPrimerExamenEnOrden || esPrimerExamenEnPagina))
                                                {
                                                    parasitologiaTable.Header(header =>
                                                    {
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("     MUESTRA").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                        header.Cell().Element(CellStyle).AlignCenter().Text("EXAMEN").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                        header.Cell().Element(CellStyle).AlignCenter().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                    });
                                                }

                                                // Determinamos el número máximo de filas a mostrar
                                                int maxRows = Math.Min(muestras.Count, Math.Min(examenesEspeciales.Count, resultadosEspeciales.Count));

                                                for (int i = 0; i < maxRows; i++)
                                                {
                                                    var muestra = muestras[i];
                                                    var examen = examenesEspeciales[i];
                                                    var resultado = resultadosEspeciales[i];

                                                    parasitologiaTable.Cell().Element(ResultadoStyle).PaddingHorizontal(12).Text(muestra.Resultado ?? "").FontSize(12);
                                                    parasitologiaTable.Cell().Element(ResultadoStyle).AlignCenter().Text(examen.NombreParametro ?? "").FontSize(12);
                                                    parasitologiaTable.Cell().Element(ResultadoStyle).Text(resultado.Resultado ?? "").AlignCenter().FontSize(12);
                                                }
                                            });
                                        }
                                    }
                                    else if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("TINCION WRIGTH"))
                                    {
                                        // Mostrar encabezado solo si es el primer examen o no es la misma tabla que la anterior
                                        if (!esMismaTabla && (esPrimerExamenEnOrden || !puedenCaberEnUnaPagina || esPrimerExamenEnPagina))
                                        {
                                            column.Item().Table(headerTable =>
                                            {
                                                headerTable.ColumnsDefinition(columns =>
                                                {
                                                    columns.RelativeColumn(2.5f); // Parámetro
                                                    columns.RelativeColumn(4);    // Resultado
                                                });

                                                headerTable.Header(header =>
                                                {
                                                    header.Cell().Element(CellStyle).AlignLeft().Text("      ANÁLISIS").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                    header.Cell().Element(CellStyle).AlignLeft().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                });
                                            });
                                        }

                                        // Mostrar descripción solo una vez
                                        if (!string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                        {
                                            column.Item().Table(descTable =>
                                            {
                                                descTable.ColumnsDefinition(columns =>
                                                {
                                                    columns.RelativeColumn();
                                                });

                                                descTable.Cell()
                                                    .PaddingVertical(2)
                                                    .Element(DescripcionStyle)
                                                    .Text(detalleOrden.IdtipoExamenNavigation.Descripcion)
                                                    .Bold()
                                                    .FontSize(12);
                                            });
                                        }

                                        column.Item().Table(resultsTable =>
                                        {
                                            resultsTable.ColumnsDefinition(columns =>
                                            {
                                                columns.RelativeColumn(2.5f);
                                                columns.RelativeColumn(4);
                                            });

                                            string currentSubtitulo = null;
                                            foreach (var resultado in resultadosFiltrados)
                                            {
                                                var subtitulo = resultado.IdparametroNavigation?.Subtitulo;
                                                if (subtitulo != currentSubtitulo && !string.IsNullOrEmpty(subtitulo))
                                                {
                                                    resultsTable.Cell().ColumnSpan(2)
                                                        .PaddingVertical(2)
                                                        .Element(SubtituloStyle)
                                                        .Text(subtitulo)
                                                        .Bold()
                                                        .FontSize(12);
                                                    currentSubtitulo = subtitulo;
                                                }

                                                resultsTable.Cell().Element(ResultadoStyle).Text(resultado.NombreParametro ?? "").FontSize(12);
                                                resultsTable.Cell().Element(ResultadoStyle).Text(resultado.Resultado ?? "").FontSize(12);
                                            }
                                        });
                                    }
                                    else if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("HEMATOLOGÍA"))
                                    {
                                        var listaResultados = resultadosFiltrados.ToList();
                                        var resultadosPorPagina = new List<List<ResultadoExaman>>();
                                        int resultadosPorPaginaCount = 15;

                                        // Obtener el género del paciente
                                        var generoPaciente = detalleOrden.IdordenNavigation.IdclienteNavigation.Genero?.ToUpper() ?? "M";
                                        var esNino = edad < 18;

                                        // Variables para verificar relación entre Segmentados y Linfocitos
                                        double valorSegmentados = 0;
                                        double valorLinfocitos = 0;
                                        bool segmentadosFueraRango = false;
                                        bool linfocitosFueraRango = false;
                                        bool marcarSoloSegmentados = false;
                                        bool marcarSoloLinfocitos = false;

                                        // Primera pasada para verificar Segmentados y Linfocitos
                                        foreach (var resultado in listaResultados)
                                        {
                                            var nombreParametro = resultado.NombreParametro ?? "";
                                            var valorResultado = resultado.Resultado ?? "";
                                            var valorReferencia = resultado.IdparametroNavigation?.ValorReferencia ?? "";

                                            if (nombreParametro.ToUpper().Contains("SEGMENTADOS"))
                                            {
                                                segmentadosFueraRango = IsResultOutOfReferenceRange(valorResultado, valorReferencia, "HEMATOLOGÍA");
                                                valorSegmentados = ExtraerPrimerNumero(valorResultado);
                                            }
                                            else if (nombreParametro.ToUpper().Contains("LINFOCITOS"))
                                            {
                                                linfocitosFueraRango = IsResultOutOfReferenceRange(valorResultado, valorReferencia, "HEMATOLOGÍA");
                                                valorLinfocitos = ExtraerPrimerNumero(valorResultado);
                                            }
                                        }

                                        // Lógica para determinar qué marcar en negrita
                                        if (segmentadosFueraRango && linfocitosFueraRango)
                                        {
                                            if (valorSegmentados > valorLinfocitos)
                                            {
                                                marcarSoloSegmentados = true;
                                            }
                                            else
                                            {
                                                marcarSoloLinfocitos = true;
                                            }
                                        }
                                        else if (segmentadosFueraRango)
                                        {
                                            marcarSoloSegmentados = true;
                                        }
                                        else if (linfocitosFueraRango)
                                        {
                                            marcarSoloLinfocitos = true;
                                        }

                                        for (int j = 0; j < listaResultados.Count; j += resultadosPorPaginaCount)
                                        {
                                            resultadosPorPagina.Add(listaResultados
                                                .Skip(j)
                                                .Take(resultadosPorPaginaCount)
                                                .ToList());
                                        }

                                        for (int j = 0; j < resultadosPorPagina.Count; j++)
                                        {
                                            var resultadosPagina = resultadosPorPagina[j];

                                            // MODIFICACIÓN PRINCIPAL: Mostrar encabezado si:
                                            // 1. Es la primera página del examen (j == 0) Y
                                            // 2. No es la misma tabla que la anterior (!esMismaTabla) Y
                                            // 3. Es el primer examen en la orden (esPrimerExamenEnOrden) O está en una nueva página
                                            if (j == 0 && !esMismaTabla && (esPrimerExamenEnOrden || !puedenCaberEnUnaPagina || esPrimerExamenEnPagina))
                                            {
                                                column.Item().Table(headerTable =>
                                                {
                                                    headerTable.ColumnsDefinition(columns =>
                                                    {
                                                        columns.RelativeColumn(3);
                                                        columns.RelativeColumn(1.3f);
                                                        columns.RelativeColumn(1);
                                                        columns.RelativeColumn(2.5f);
                                                    });

                                                    headerTable.Header(header =>
                                                    {
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("      ANÁLISIS").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                        header.Cell().Element(CellStyle).Text("").Bold().FontColor(Colors.White);
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("VALORES DE REFERENCIA").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                    });

                                                    if (!string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                                    {
                                                        headerTable.Cell().ColumnSpan(4)
                                                            .PaddingVertical(2)
                                                            .Element(DescripcionStyle)
                                                            .Text(detalleOrden.IdtipoExamenNavigation.Descripcion)
                                                            .Bold()
                                                            .FontSize(12);
                                                    }
                                                });
                                            }

                                            column.Item().Table(resultsTable =>
                                            {
                                                resultsTable.ColumnsDefinition(columns =>
                                                {
                                                    columns.RelativeColumn(3);
                                                    columns.RelativeColumn(1.3f);
                                                    columns.RelativeColumn(1);
                                                    columns.RelativeColumn(2.5f);
                                                });

                                                string currentSubtitulo = null;
                                                foreach (var resultado in resultadosPagina)
                                                {
                                                    var subtitulo = resultado.IdparametroNavigation?.Subtitulo;
                                                    if (subtitulo != currentSubtitulo && !string.IsNullOrEmpty(subtitulo))
                                                    {
                                                        resultsTable.Cell().ColumnSpan(4)
                                                            .PaddingVertical(2)
                                                            .Element(SubtituloStyle)
                                                            .Text(subtitulo)
                                                            .Bold()
                                                            .FontSize(12);
                                                        currentSubtitulo = subtitulo;
                                                    }

                                                    var nombreParametro = resultado.NombreParametro ?? "";
                                                    var valorResultado = resultado.Resultado ?? "";
                                                    var valorReferencia = resultado.IdparametroNavigation?.ValorReferencia ?? "";

                                                    // Parámetros que van en negrita
                                                    var parametrosNegrita = new[] { "ERITROCITOS", "LEUCOCITOS", "PLAQUETAS", "TIPO Y RH" };
                                                    bool esParametroNegrita = parametrosNegrita.Any(p => nombreParametro.ToUpper().Contains(p));

                                                    // Parámetros con valores por género
                                                    var parametrosGenero = new[] { "HEMATOCRITO", "HEMOGLOBINA" };
                                                    bool esParametroGenero = parametrosGenero.Any(p => nombreParametro.ToUpper().Contains(p));

                                                    // Ajustar valores de referencia según género/edad
                                                    if (esParametroNegrita || esParametroGenero)
                                                    {
                                                        if (nombreParametro.ToUpper().Contains("ERITROCITOS"))
                                                        {
                                                            if (edad < 12)
                                                                valorReferencia = "4,000,000 - 5,200,000";
                                                            else if (generoPaciente == "F")
                                                                valorReferencia = "4,000,000 - 5,200,000";
                                                            else
                                                                valorReferencia = "4,400,000 - 6,000,000";
                                                        }
                                                        else if (nombreParametro.ToUpper().Contains("HEMATOCRITO"))
                                                        {
                                                            if (edad < 12) valorReferencia = "37 - 47";  // Mismo que mujeres adultas
                                                            else if (generoPaciente == "F") valorReferencia = "37 - 47";
                                                            else valorReferencia = "39 - 53";  // Hombres adultos
                                                        }
                                                        else if (nombreParametro.ToUpper().Contains("HEMOGLOBINA"))
                                                        {
                                                            if (edad < 12) valorReferencia = "12 - 16";  // Mismo que mujeres adultas
                                                            else if (generoPaciente == "F") valorReferencia = "12 - 16";
                                                            else valorReferencia = "14 - 18";  // Hombres adultos
                                                        }
                                                    }

                                                    // Nombre del parámetro
                                                    resultsTable.Cell().Element(ResultadoStyle).Text(text =>
                                                    {
                                                        if (esParametroNegrita) text.Span(nombreParametro).Bold().FontSize(12);
                                                        else text.Span(nombreParametro).FontSize(12);
                                                    });

                                                    // Resultado - Caso especial para TIPO Y RH
                                                    if (nombreParametro.ToUpper().Contains("TIPO Y RH"))
                                                    {
                                                        resultsTable.Cell().Element(ResultadoStyle).Text(text =>
                                                        {
                                                            var resultadoUnido = (resultado.Resultado ?? "").Replace("\n", " ").Replace("\r", "");
                                                            text.Span(resultadoUnido).Bold().FontSize(11);
                                                        });
                                                    }
                                                    else
                                                    {
                                                        // Comportamiento normal para otros parámetros
                                                        resultsTable.Cell().Element(ResultadoStyle).Text(text =>
                                                        {
                                                            bool fueraDeRango = IsResultOutOfReferenceRange(valorResultado, valorReferencia, "HEMATOLOGÍA");
                                                            bool mostrarNegrita = fueraDeRango &&
                                                                                       ((nombreParametro.ToUpper().Contains("SEGMENTADOS") && marcarSoloSegmentados) ||
                                                                                        (nombreParametro.ToUpper().Contains("LINFOCITOS") && marcarSoloLinfocitos) ||
                                                                                       (!nombreParametro.ToUpper().Contains("SEGMENTADOS") &&
                                                                                        !nombreParametro.ToUpper().Contains("LINFOCITOS") && fueraDeRango));

                                                            if (mostrarNegrita) text.Span(valorResultado).Bold().FontColor(Colors.Black).FontSize(12);
                                                            else text.Span(valorResultado).FontSize(12);
                                                        });
                                                    }

                                                    resultsTable.Cell().Element(ResultadoStyle).PaddingLeft(-20).Text(resultado.IdparametroNavigation?.UnidadMedida ?? "").FontSize(12);
                                                    resultsTable.Cell().Element(ResultadoStyle).Text(valorReferencia).FontSize(12);
                                                }
                                            });
                                        }

                                        // Nota al pie
                                        column.Item().PaddingTop(10).Text("**Intervalos de referencias obtenidos del libro: Hematología, la sangre y sus enfermedades; 2da edición, 2009.")
                                            .FontSize(10);
                                    }
                                    else if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("QUÍMICA SANGUÍNEA"))
                                    {
                                        var listaResultados = resultadosFiltrados.ToList();
                                        var resultadosPorPagina = new List<List<ResultadoExaman>>();
                                        int resultadosPorPaginaCount = 15;

                                        // Obtener el género del paciente
                                        var generoPaciente = detalleOrden.IdordenNavigation.IdclienteNavigation.Genero?.ToUpper() ?? "M";
                                        var esNino = edad < 18; // Asumiendo que menor de 18 años es niño

                                        // Verificar si existe exactamente el parámetro "Glicohemoglobina A1C"
                                        bool tieneGlicohemoglobina = listaResultados.Any(r =>
                                            r.NombreParametro != null &&
                                            r.NombreParametro.Equals("Glicohemoglobina A1C", StringComparison.OrdinalIgnoreCase));

                                        for (int j = 0; j < listaResultados.Count; j += resultadosPorPaginaCount)
                                        {
                                            resultadosPorPagina.Add(listaResultados
                                                .Skip(j)
                                                .Take(resultadosPorPaginaCount)
                                                .ToList());
                                        }

                                        bool descripcionMostrada = false;

                                        for (int j = 0; j < resultadosPorPagina.Count; j++)
                                        {
                                            var resultadosPagina = resultadosPorPagina[j];

                                            // MODIFICACIÓN PRINCIPAL: Mostrar encabezado si:
                                            // 1. Es la primera página del examen (j == 0) Y
                                            // 2. No es la misma tabla que la anterior (!esMismaTabla) Y
                                            // 3. Es el primer examen en la orden (esPrimerExamenEnOrden) O está en una nueva página
                                            if (j == 0 && !esMismaTabla && (esPrimerExamenEnOrden || !puedenCaberEnUnaPagina || esPrimerExamenEnPagina))
                                            {
                                                column.Item().Table(headerTable =>
                                                {
                                                    headerTable.ColumnsDefinition(columns =>
                                                    {
                                                        columns.RelativeColumn(3);     // ANÁLISIS
                                                        columns.RelativeColumn(1.3f);  // RESULTADO
                                                        columns.RelativeColumn(1);     // UNIDAD DE MEDIDA
                                                        columns.RelativeColumn(2.5f);  // VALORES DE REFERENCIA
                                                    });

                                                    headerTable.Header(header =>
                                                    {
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("      ANÁLISIS").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                        header.Cell().Element(CellStyle).Text("").Bold().FontColor(Colors.White);
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("VALORES DE REFERENCIA").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                    });
                                                });
                                            }

                                            column.Item().Table(resultsTable =>
                                            {
                                                resultsTable.ColumnsDefinition(columns =>
                                                {
                                                    columns.RelativeColumn(3);
                                                    columns.RelativeColumn(1.3f);
                                                    columns.RelativeColumn(1);
                                                    columns.RelativeColumn(2.5f);
                                                });

                                                // Mostrar descripción solo una vez en la primera página
                                                if (!descripcionMostrada && !string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                                {
                                                    resultsTable.Cell().ColumnSpan(4)
                                                        .PaddingVertical(2)
                                                        .Element(DescripcionStyle)
                                                        .Text(detalleOrden.IdtipoExamenNavigation.Descripcion)
                                                        .Bold()
                                                        .FontSize(12);
                                                    descripcionMostrada = true;
                                                }

                                                string currentSubtitulo = null;

                                                foreach (var resultado in resultadosPagina)
                                                {
                                                    var subtitulo = resultado.IdparametroNavigation?.Subtitulo;
                                                    if (subtitulo != currentSubtitulo && !string.IsNullOrEmpty(subtitulo))
                                                    {
                                                        resultsTable.Cell().ColumnSpan(4)
                                                            .PaddingVertical(2)
                                                            .Element(SubtituloStyle)
                                                            .Text(subtitulo)
                                                            .Bold()
                                                            .FontSize(12);
                                                        currentSubtitulo = subtitulo;
                                                    }

                                                    var nombreParametro = resultado.NombreParametro ?? "";
                                                    string valorReferencia = resultado.IdparametroNavigation?.ValorReferencia ?? "";

                                                    // Aplicar lógica de valores por género/edad para Química Sanguínea
                                                    if (nombreParametro.ToUpper().Contains("CREATININA"))
                                                    {
                                                        if (edad < 10) // Niños menores de 10 años
                                                        {
                                                            valorReferencia = "0.3 - 0.7 mg/dL";
                                                        }
                                                        else if (edad >= 10 && edad < 18) // Niños de 10 a 17 años
                                                        {
                                                            valorReferencia = "0.7 - 1.4 mg/dL";
                                                        }
                                                        else if (generoPaciente == "F") // Mujeres adultas (18+)
                                                        {
                                                            valorReferencia = "0.6 - 1.1 mg/dL";
                                                        }
                                                        else // Hombres adultos (18+)
                                                        {
                                                            valorReferencia = "0.7 - 1.4 mg/dL";
                                                        }
                                                    }
                                                    else if (nombreParametro.ToUpper().Contains("ÁCIDO ÚRICO") || nombreParametro.ToUpper().Contains("ACIDO URICO"))
                                                    {
                                                        if (generoPaciente == "F")
                                                            valorReferencia = "2.6 - 6.0 mg/dL";
                                                        else
                                                            valorReferencia = "3.5 - 7.2 mg/dL";
                                                    }
                                                    else if (nombreParametro.ToUpper().Contains("TRANSAMINASA OXALACÉTICA") ||
                                                             nombreParametro.ToUpper().Contains("TGO") ||
                                                             nombreParametro.ToUpper().Contains("AST"))
                                                    {
                                                        if (generoPaciente == "F")
                                                            valorReferencia = "Menor de 31 U/L";
                                                        else
                                                            valorReferencia = "Menor de 35 U/L";
                                                    }
                                                    else if (nombreParametro.ToUpper().Contains("TRANSAMINASA PIRÚVICA") ||
                                                             nombreParametro.ToUpper().Contains("TGP") ||
                                                             nombreParametro.ToUpper().Contains("ALT"))
                                                    {
                                                        if (generoPaciente == "F")
                                                            valorReferencia = "Menor de 31 U/L";
                                                        else
                                                            valorReferencia = "Menor de 41 U/L";
                                                    }
                                                    else if (nombreParametro.ToUpper().Contains("LDH"))
                                                    {
                                                        if (generoPaciente == "F")
                                                            valorReferencia = "Menor de 247 U/L";
                                                        else
                                                            valorReferencia = "Menor de 248 U/L";
                                                    }

                                                    resultsTable.Cell().Element(ResultadoStyle).Text(nombreParametro).FontSize(12);
                                                    resultsTable.Cell().Element(ResultadoStyle).Text(text =>
                                                    {
                                                        bool esValorAnormal = IsResultOutOfReferenceRange(
                                                            resultado.Resultado ?? "",
                                                            valorReferencia,
                                                            "QUÍMICA SANGUÍNEA"
                                                        );
                                                        if (esValorAnormal)
                                                        {
                                                            text.Span(resultado.Resultado ?? "").Bold().FontColor(Colors.Black).FontSize(12);
                                                        }
                                                        else
                                                        {
                                                            text.Span(resultado.Resultado ?? "").FontSize(12);
                                                        }
                                                    });
                                                    resultsTable.Cell().Element(ResultadoStyle).PaddingLeft(-40).Text(resultado.IdparametroNavigation?.UnidadMedida ?? "").FontSize(12);
                                                    resultsTable.Cell().Element(ResultadoStyle).Text(valorReferencia).FontSize(12);
                                                }
                                            });
                                        }

                                        // Mostrar notas solo si existe el parámetro exacto "Glicohemoglobina A1C"
                                        if (tieneGlicohemoglobina)
                                        {
                                            column.Item().PaddingTop(12).AlignCenter().Column(col =>
                                            {
                                                col.Item().Text(text =>
                                                {
                                                    text.Span("VALORES DE REFERENCIA").Bold();
                                                });

                                                col.Item().PaddingLeft(10).Text(text =>
                                                {
                                                    text.Span("- 4.5 a 5.6     Paciente no Diabético").FontSize(10);
                                                });

                                                col.Item().PaddingLeft(10).Text(text =>
                                                {
                                                    text.Span("- 5.7 a 6.0     Riesgo de desarrollar Diabetes").FontSize(10);
                                                });

                                                col.Item().PaddingLeft(10).Text(text =>
                                                {
                                                    text.Span("- 6.1 a 6.5     Alto riesgo de desarrollar Diabetes").FontSize(10);
                                                });

                                                col.Item().PaddingLeft(10).Text(text =>
                                                {
                                                    text.Span("- Paciente diabético, mal controlado o con metabolismo desequilibrado mayor de 8.5%").FontSize(10);
                                                });
                                            });
                                        }
                                    }
                                    else if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("SEROLOGÍA"))
                                    {
                                        var listaResultados = resultadosFiltrados.ToList();
                                        var resultadosPorPagina = new List<List<ResultadoExaman>>();
                                        int resultadosPorPaginaCount = 15;

                                        for (int j = 0; j < listaResultados.Count; j += resultadosPorPaginaCount)
                                        {
                                            resultadosPorPagina.Add(listaResultados
                                                .Skip(j)
                                                .Take(resultadosPorPaginaCount)
                                                .ToList());
                                        }

                                        for (int j = 0; j < resultadosPorPagina.Count; j++)
                                        {
                                            var resultadosPagina = resultadosPorPagina[j];

                                            // MODIFICACIÓN PRINCIPAL: Mostrar encabezado si:
                                            // 1. Es la primera página del examen (j == 0) Y
                                            // 2. No es la misma tabla que la anterior (!esMismaTabla) Y
                                            // 3. Es el primer examen en la orden (esPrimerExamenEnOrden) O está en una nueva página
                                            if (j == 0 && !esMismaTabla && (esPrimerExamenEnOrden || !puedenCaberEnUnaPagina || esPrimerExamenEnPagina))
                                            {
                                                column.Item().Table(headerTable =>
                                                {
                                                    headerTable.ColumnsDefinition(columns =>
                                                    {
                                                        columns.RelativeColumn(3);     // ANÁLISIS
                                                        columns.RelativeColumn(1.3f);  // RESULTADO
                                                        columns.RelativeColumn(1);     // UNIDAD DE MEDIDA (vacío en algunos casos)
                                                        columns.RelativeColumn(2.5f);  // VALORES DE REFERENCIA
                                                    });

                                                    headerTable.Header(header =>
                                                    {
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("      ANÁLISIS").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                        header.Cell().Element(CellStyle).Text("").Bold().FontColor(Colors.White);
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("VALORES DE REFERENCIA").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                    });
                                                });
                                            }

                                            column.Item().Table(resultsTable =>
                                            {
                                                resultsTable.ColumnsDefinition(columns =>
                                                {
                                                    columns.RelativeColumn(3);
                                                    columns.RelativeColumn(1.3f);
                                                    columns.RelativeColumn(1);
                                                    columns.RelativeColumn(2.5f);
                                                });

                                                string currentSubtitulo = null;
                                                bool descripcionAgregada = false;

                                                foreach (var resultado in resultadosPagina)
                                                {
                                                    // Agregar descripción solo una vez, antes del primer parámetro
                                                    if (!descripcionAgregada && !string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                                    {
                                                        resultsTable.Cell().ColumnSpan(4)
                                                            .PaddingVertical(2)
                                                            .Element(DescripcionStyle)
                                                            .Text(detalleOrden.IdtipoExamenNavigation.Descripcion)
                                                            .Bold()
                                                            .FontSize(12);

                                                        descripcionAgregada = true;
                                                    }

                                                    var subtitulo = resultado.IdparametroNavigation?.Subtitulo;
                                                    if (subtitulo != currentSubtitulo && !string.IsNullOrEmpty(subtitulo))
                                                    {
                                                        resultsTable.Cell().ColumnSpan(4)
                                                            .PaddingVertical(2)
                                                            .Element(SubtituloStyle)
                                                            .Text(subtitulo)
                                                            .Bold()
                                                            .FontSize(12);
                                                        currentSubtitulo = subtitulo;
                                                    }

                                                    var nombreParametro = resultado.NombreParametro ?? "";
                                                    var valorResultado = resultado.Resultado ?? "";
                                                    var valorReferencia = resultado.IdparametroNavigation?.ValorReferencia ?? "";

                                                    // Nombre del parámetro
                                                    resultsTable.Cell().Element(ResultadoStyle).Text(nombreParametro).FontSize(12);

                                                    // Resultado (negrita si es anormal)
                                                    bool esValorAnormal = IsResultOutOfReferenceRange(valorResultado, valorReferencia, "SEROLOGÍA");
                                                    resultsTable.Cell().Element(ResultadoStyle).Text(text =>
                                                    {
                                                        if (esValorAnormal)
                                                            text.Span(valorResultado).Bold().FontColor(Colors.Black).FontSize(12);
                                                        else
                                                            text.Span(valorResultado).FontSize(12);
                                                    });

                                                    // Unidad de medida (puede ir vacío si no aplica)
                                                    resultsTable.Cell().Element(ResultadoStyle).PaddingLeft(-20).Text(resultado.IdparametroNavigation?.UnidadMedida ?? "").FontSize(12);

                                                    // Valor de referencia
                                                    resultsTable.Cell().Element(ResultadoStyle).Text(valorReferencia).FontSize(12);
                                                }
                                            });
                                        }
                                    }
                                    else if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("CITOLOGÍA FECAL"))
                                    {
                                        // Estilo especial para Citología Fecal con más espacio vertical pero sin bordes
                                        Func<IContainer, IContainer> CeldaAltaStyle = cell => cell
                                            .PaddingVertical(10)  // Aumentamos el espacio vertical (antes era ~5)
                                            .PaddingHorizontal(5);

                                        // Mostrar encabezado solo si es el primer examen o no es la misma tabla que la anterior
                                        if (!esMismaTabla && (esPrimerExamenEnOrden || !puedenCaberEnUnaPagina || esPrimerExamenEnPagina))
                                        {
                                            column.Item().Table(headerTable =>
                                            {
                                                headerTable.ColumnsDefinition(columns =>
                                                {
                                                    columns.RelativeColumn(3);     // ANÁLISIS
                                                    columns.RelativeColumn(1.3f);  // RESULTADO
                                                    columns.RelativeColumn(1);     // UNIDAD DE MEDIDA
                                                    columns.RelativeColumn(2.5f);  // VALORES DE REFERENCIA
                                                });

                                                headerTable.Header(header =>
                                                {
                                                    header.Cell().Element(CellStyle).AlignLeft().Text("      ANÁLISIS").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                    header.Cell().Element(CellStyle).AlignLeft().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                    header.Cell().Element(CellStyle).Text("").Bold().FontColor(Colors.White);
                                                    header.Cell().Element(CellStyle).AlignLeft().Text("VALORES DE REFERENCIA").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                });
                                            });
                                        }

                                        // Mostrar descripción solo una vez
                                        if (!string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                        {
                                            column.Item().Table(descTable =>
                                            {
                                                descTable.ColumnsDefinition(columns =>
                                                {
                                                    columns.RelativeColumn();
                                                });

                                                descTable.Cell()
                                                    .PaddingVertical(10)  // Más espacio para la descripción
                                                    .Element(DescripcionStyleSinBordes)
                                                    .Text(detalleOrden.IdtipoExamenNavigation.Descripcion)
                                                    .Bold()
                                                    .FontSize(12);
                                            });
                                        }

                                        column.Item().Table(resultsTable =>
                                        {
                                            resultsTable.ColumnsDefinition(columns =>
                                            {
                                                columns.RelativeColumn(3);
                                                columns.RelativeColumn(1.3f);
                                                columns.RelativeColumn(1);
                                                columns.RelativeColumn(2.5f);
                                            });

                                            string currentSubtitulo = null;
                                            foreach (var resultado in resultadosFiltrados)
                                            {
                                                var subtitulo = resultado.IdparametroNavigation?.Subtitulo;
                                                if (subtitulo != currentSubtitulo && !string.IsNullOrEmpty(subtitulo))
                                                {
                                                    resultsTable.Cell().ColumnSpan(4)
                                                        .PaddingVertical(10)  // Más espacio para subtítulos
                                                        .Element(SubtituloStyleSinBordes)
                                                        .Text(subtitulo)
                                                        .Bold()
                                                        .FontSize(12);
                                                    currentSubtitulo = subtitulo;
                                                }

                                                // Aplicar el estilo con más espacio vertical
                                                resultsTable.Cell().Element(CeldaAltaStyle).Text(resultado.NombreParametro ?? "").FontSize(12);
                                                resultsTable.Cell().Element(CeldaAltaStyle).Text(resultado.Resultado ?? "").FontSize(12);
                                                resultsTable.Cell().Element(CeldaAltaStyle).Text(resultado.IdparametroNavigation?.UnidadMedida ?? "").FontSize(12);
                                                resultsTable.Cell().Element(CeldaAltaStyle).Text(resultado.IdparametroNavigation?.ValorReferencia ?? "").FontSize(12);
                                            }
                                        });
                                    }
                                    else if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("COAGULACIÓN"))
                                    {
                                        var listaResultados = resultadosFiltrados.ToList();
                                        var resultadosPorPagina = new List<List<ResultadoExaman>>();
                                        int resultadosPorPaginaCount = 15;

                                        for (int j = 0; j < listaResultados.Count; j += resultadosPorPaginaCount)
                                        {
                                            resultadosPorPagina.Add(listaResultados
                                                .Skip(j)
                                                .Take(resultadosPorPaginaCount)
                                                .ToList());
                                        }

                                        bool descripcionMostrada = false;

                                        for (int j = 0; j < resultadosPorPagina.Count; j++)
                                        {
                                            var resultadosPagina = resultadosPorPagina[j];

                                            // Mostrar encabezado solo si:
                                            // 1. Es la primera página del examen (j == 0) Y
                                            // 2. No es la misma tabla que la anterior (!esMismaTabla) Y
                                            // 3. Es el primer examen en la orden (esPrimerExamenEnOrden) O está en una nueva página
                                            if (j == 0)
                                            {
                                                column.Item().Table(headerTable =>
                                                {
                                                    headerTable.ColumnsDefinition(columns =>
                                                    {
                                                        columns.RelativeColumn(3);     // ANÁLISIS
                                                        columns.RelativeColumn(1.8f);  // RESULTADO
                                                        columns.RelativeColumn(2.4f);  // VALORES DE REFERENCIA
                                                    });

                                                    headerTable.Header(header =>
                                                    {
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("      ANÁLISIS").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("VALORES DE REFERENCIA").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                    });
                                                });
                                            }

                                            column.Item().Table(resultsTable =>
                                            {
                                                resultsTable.ColumnsDefinition(columns =>
                                                {
                                                    columns.RelativeColumn(3);
                                                    columns.RelativeColumn(1.8f);
                                                    columns.RelativeColumn(2.4f);
                                                });

                                                // Mostrar descripción solo una vez en la primera página
                                                if (!descripcionMostrada && !string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                                {
                                                    resultsTable.Cell().ColumnSpan(3)
                                                        .PaddingVertical(2)
                                                        .Element(DescripcionStyle)
                                                        .Text(detalleOrden.IdtipoExamenNavigation.Descripcion)
                                                        .Bold()
                                                        .FontSize(12);
                                                    descripcionMostrada = true;
                                                }

                                                string currentSubtitulo = null;
                                                foreach (var resultado in resultadosPagina)
                                                {
                                                    var subtitulo = resultado.IdparametroNavigation?.Subtitulo;
                                                    if (subtitulo != currentSubtitulo && !string.IsNullOrEmpty(subtitulo))
                                                    {
                                                        resultsTable.Cell().ColumnSpan(3)
                                                            .PaddingVertical(2)
                                                            .Element(SubtituloStyle)
                                                            .Text(subtitulo)
                                                            .Bold()
                                                            .FontSize(12);
                                                        currentSubtitulo = subtitulo;
                                                    }


                                                    var nombreParametro = resultado.NombreParametro ?? "";
                                                    var valorResultado = resultado.Resultado ?? "";
                                                    var valorReferencia = resultado.IdparametroNavigation?.ValorReferencia ?? "";

                                                    // Nombre del parámetro
                                                    resultsTable.Cell().Element(ResultadoStyle).Text(nombreParametro).FontSize(12);

                                                    // Resultado centrado
                                                    resultsTable.Cell().Element(ResultadoStyle).Text(valorResultado).FontSize(12);

                                                    // Valor de referencia
                                                    resultsTable.Cell().Element(ResultadoStyle).Text(valorReferencia).FontSize(12);
                                                }
                                            });
                                        }
                                    }
                                    else if (detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper().Contains("UROCULTIVO"))
                                    {
                                        // Verificar si es un urocultivo negativo:
                                        // 1. Si hay un parámetro llamado "OBSERVACION" o "NOTA"
                                        // 2. O si todos los parámetros están vacíos (excepto posibles notas)
                                        bool esUrocultivoNegativo = resultadosFiltrados.Any(r =>
                                            r.NombreParametro != null &&
                                            (r.NombreParametro.Equals("OBSERVACION", StringComparison.OrdinalIgnoreCase) ||
                                             r.NombreParametro.Equals("NOTA", StringComparison.OrdinalIgnoreCase))) ||
                                           !resultadosFiltrados.Any(r =>
                                               !string.IsNullOrWhiteSpace(r.Resultado) &&
                                               r.NombreParametro != null &&
                                               !r.NombreParametro.Equals("OBSERVACION", StringComparison.OrdinalIgnoreCase) &&
                                               !r.NombreParametro.Equals("NOTA", StringComparison.OrdinalIgnoreCase));

                                        if (esUrocultivoNegativo)
                                        {
                                            // Mostrar formato de UROCULTIVO NEGATIVO
                                            column.Item().PaddingTop(15).AlignCenter().Column(centeredColumn =>
                                            {
                                                centeredColumn.Item().PaddingBottom(10).Text(text =>
                                                {
                                                    text.Span("RESULTADO").Bold().FontSize(12);
                                                });

                                                centeredColumn.Item().PaddingBottom(20).AlignCenter().Text(text =>
                                                {
                                                    text.Span("NO HUBO CRECIMIENTO BACTERIANO EN 48 HORAS DE INCUBACIÓN.").FontSize(12);
                                                });

                                                // Mostrar la NOTA personalizada si existe y no es solo un punto
                                                if (notaParametro != null && !string.IsNullOrWhiteSpace(notaParametro.Resultado))
                                                {
                                                    string nota = notaParametro.Resultado.Trim();
                                                    if (nota != ".")
                                                    {
                                                        centeredColumn.Item().PaddingBottom(10).Text(text =>
                                                        {
                                                            text.Span("NOTA: ").Bold().FontSize(12);
                                                            text.Span(notaParametro.Resultado).FontSize(12);
                                                        });
                                                    }
                                                }

                                                // Agregar la nota estática
                                                centeredColumn.Item().PaddingTop(20).Text(text =>
                                                {
                                                    text.Span("NOTA: ").Bold().FontSize(12);
                                                    text.Span("Para un cultivo de orina apropiado, es esencial la recolección adecuada de la muestra y evitar la ingesta de antibiótico, ya que afecta directamente el resultado del urocultivo.").FontSize(14);
                                                });
                                            });
                                        }
                                        else
                                        {
                                            // Mostrar formato de UROCULTIVO normal
                                            // Separar los 3 primeros parámetros (MICROORGANISMO AISLADO, CONTALE DE COLONIAS, BLEE)
                                            var parametrosEspeciales = resultadosFiltrados
                                                .Where(r => r.NombreParametro != null &&
                                                       (r.NombreParametro.ToUpper().Contains("MICROORGANISMO AISLADO") ||
                                                        r.NombreParametro.ToUpper().Contains("CONTAJE DE COLONIAS") ||
                                                        r.NombreParametro.ToUpper().Contains("BLEE")))
                                                .OrderBy(r => r.Idparametro)
                                                .ToList();

                                            // Los demás parámetros van en la tabla de antibióticos
                                            var parametrosTabla = resultadosFiltrados
                                                .Where(r => !parametrosEspeciales.Contains(r))
                                                .ToList();

                                            // Mostrar los 3 parámetros especiales en una tabla con bordes
                                            column.Item().PaddingTop(10).Table(specialTable =>
                                            {
                                                specialTable.ColumnsDefinition(columns =>
                                                {
                                                    columns.RelativeColumn(3); // Nombre del parámetro
                                                    columns.RelativeColumn(2); // Resultado
                                                });

                                                foreach (var parametro in parametrosEspeciales)
                                                {
                                                    specialTable.Cell().Element(CellContentStyle).Text(text =>
                                                    {
                                                        text.Span($"{parametro.NombreParametro?.ToUpper()}").Bold().FontSize(12);
                                                    });

                                                    // Formatear el resultado si es el parámetro "CONTAJE DE COLONIAS"
                                                    string resultadoFormateado = parametro.Resultado ?? "";
                                                    if (parametro.NombreParametro != null &&
                                                        parametro.NombreParametro.ToUpper().Contains("CONTAJE DE COLONIAS") &&
                                                        !string.IsNullOrWhiteSpace(resultadoFormateado))
                                                    {
                                                        // Reemplazar puntos por comas en los valores numéricos
                                                        resultadoFormateado = resultadoFormateado
                                                            .Replace("20.000", "20,000")
                                                            .Replace("30.000", "30,000")
                                                            .Replace("50.000", "50,000")
                                                            .Replace("80.000", "80,000")
                                                            .Replace(">100.000", ">100,000");
                                                    }

                                                    specialTable.Cell().Element(CellContentStyle).Text(resultadoFormateado).FontSize(12);
                                                }
                                            });

                                            // Mostrar la descripción del examen si existe
                                            if (!string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                            {
                                                column.Item().PaddingTop(15).AlignCenter().Text(detalleOrden.IdtipoExamenNavigation.Descripcion).Bold().FontSize(12);
                                                column.Item().PaddingBottom(10); // Espacio adicional después de la descripción
                                            }

                                            // Mostrar la tabla de antibióticos
                                            column.Item().Table(table =>
                                            {
                                                table.ColumnsDefinition(columns =>
                                                {
                                                    columns.RelativeColumn(3); // Antibiótico
                                                    columns.RelativeColumn(2); // Resultado
                                                });

                                                // Encabezado de la tabla
                                                table.Header(header =>
                                                {
                                                    header.Cell().Element(CellStyle).AlignLeft().Text("     Antibióticos").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                    header.Cell().Element(CellStyle).AlignLeft().Text("Resultados").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                });

                                                // Filas de datos
                                                foreach (var resultado in parametrosTabla)
                                                {
                                                    table.Cell().Element(ResultadoStyle).Text(resultado.NombreParametro ?? "").FontSize(12);
                                                    table.Cell().Element(ResultadoStyle).Text(resultado.Resultado ?? "").FontSize(12);
                                                }
                                            });

                                            // NOTA INDEPENDIENTE PARA UROCULTIVO NORMAL
                                            column.Item().PaddingTop(20).Column(notaColumn =>
                                            {
                                                // Mostrar la NOTA personalizada si existe
                                                if (notaParametro != null && !string.IsNullOrWhiteSpace(notaParametro.Resultado))
                                                {
                                                    notaColumn.Item().Text(text =>
                                                    {
                                                        text.Span("NOTA: ").Bold().FontSize(12);
                                                        text.Span(notaParametro.Resultado).FontSize(12);
                                                    });
                                                }
                                            });
                                        }
                                    }
                                    else // TABLA ESTÁNDAR
                                    {
                                        var listaResultados = resultadosFiltrados.ToList();
                                        var resultadosPorPagina = new List<List<ResultadoExaman>>();
                                        int resultadosPorPaginaCount = 15;

                                        // Variables para controlar lo que se muestra
                                        var subtitulosMostradosEnExamen = new HashSet<string>();
                                        bool descripcionMostrada = false;

                                        for (int j = 0; j < listaResultados.Count; j += resultadosPorPaginaCount)
                                        {
                                            resultadosPorPagina.Add(listaResultados
                                                .Skip(j)
                                                .Take(resultadosPorPaginaCount)
                                                .ToList());
                                        }

                                        for (int j = 0; j < resultadosPorPagina.Count; j++)
                                        {
                                            var resultadosPagina = resultadosPorPagina[j];

                                            // Mostrar encabezado de columnas solo si:
                                            // 1. Es la primera página del examen Y
                                            // 2. No es la misma tabla que la anterior (esMismaTabla == false)
                                            // 3. Es el primer examen en la orden o los exámenes no caben en una página
                                            // MODIFICACIÓN PRINCIPAL: Mostrar encabezado si:
                                            // 1. Es la primera página del examen (j == 0) Y
                                            // 2. No es la misma tabla que la anterior (!esMismaTabla) Y
                                            // 3. Es el primer examen en la orden (esPrimerExamenEnOrden) O está en una nueva página
                                            if (j == 0 && !esMismaTabla && (esPrimerExamenEnOrden || !puedenCaberEnUnaPagina || esPrimerExamenEnPagina))
                                            {
                                                column.Item().Table(headerTable =>
                                                {
                                                    headerTable.ColumnsDefinition(columns =>
                                                    {
                                                        columns.RelativeColumn(3);
                                                        columns.RelativeColumn(1.3f);
                                                        columns.RelativeColumn(1);
                                                        columns.RelativeColumn(2.5f);
                                                    });

                                                    headerTable.Header(header =>
                                                    {
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("      ANÁLISIS").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("RESULTADO").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                        header.Cell().Element(CellStyle).Text("").Bold().FontColor(Colors.White);
                                                        header.Cell().Element(CellStyle).AlignLeft().Text("VALORES DE REFERENCIA").Bold().FontColor(Colors.White).FontSize(12.5f);
                                                    });
                                                });
                                            }

                                            // Mostrar descripción (si existe) SOLO UNA VEZ en la primera página del examen
                                            // Independientemente de si mostramos encabezados o no
                                            if (j == 0 && !descripcionMostrada && !string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                            {
                                                column.Item().Table(descTable =>
                                                {
                                                    descTable.ColumnsDefinition(columns =>
                                                    {
                                                        columns.RelativeColumn();
                                                    });

                                                    descTable.Cell()
                                                        .PaddingVertical(2)
                                                        .Element(DescripcionStyle)
                                                        .Text(detalleOrden.IdtipoExamenNavigation.Descripcion)
                                                        .Bold()
                                                        .FontSize(12);
                                                });

                                                descripcionMostrada = true;
                                            }

                                            // Tabla de resultados
                                            column.Item().Table(resultsTable =>
                                            {
                                                resultsTable.ColumnsDefinition(columns =>
                                                {
                                                    columns.RelativeColumn(3);
                                                    columns.RelativeColumn(1.3f);
                                                    columns.RelativeColumn(1);
                                                    columns.RelativeColumn(2.5f);
                                                });

                                                string currentSubtitulo = null;
                                                foreach (var resultado in resultadosPagina)
                                                {
                                                    var subtitulo = resultado.IdparametroNavigation?.Subtitulo;

                                                    // Mostrar subtítulo solo si:
                                                    // 1. Es diferente al actual Y
                                                    // 2. No está vacío Y
                                                    // 3. No se ha mostrado antes en este examen
                                                    if (subtitulo != currentSubtitulo &&
                                                        !string.IsNullOrEmpty(subtitulo) &&
                                                        !subtitulosMostradosEnExamen.Contains(subtitulo))
                                                    {
                                                        resultsTable.Cell().ColumnSpan(4)
                                                            .PaddingVertical(2)
                                                            .Element(SubtituloStyle)
                                                            .Text(subtitulo)
                                                            .Bold()
                                                            .FontSize(12);

                                                        currentSubtitulo = subtitulo;
                                                        subtitulosMostradosEnExamen.Add(subtitulo);
                                                    }

                                                    // Verificar si es el parámetro "Cristales" o "Cilindros"
                                                    bool esCristales = resultado.NombreParametro?.Contains("Cristales", StringComparison.OrdinalIgnoreCase) ?? false;
                                                    bool esCilindros = resultado.NombreParametro?.Contains("Cilindros", StringComparison.OrdinalIgnoreCase) ?? false;
                                                    bool esColor = resultado.NombreParametro?.Contains("Color", StringComparison.OrdinalIgnoreCase) ?? false;

                                                    if (esCristales || esCilindros || esColor)
                                                    {
                                                        // Para Cristales o Cilindros: ocupar toda la línea
                                                        resultsTable.Cell().Element(ResultadoStyle).Text(resultado.NombreParametro ?? "").FontSize(12);
                                                        resultsTable.Cell().ColumnSpan(3).Element(ResultadoStyle).Text(resultado.Resultado ?? "").FontSize(12);
                                                    }
                                                    else
                                                    {
                                                        // Para otros parámetros: formato normal
                                                        resultsTable.Cell().Element(ResultadoStyle).Text(resultado.NombreParametro ?? "").FontSize(12);
                                                        resultsTable.Cell().Element(ResultadoStyle).Text(resultado.Resultado ?? "").FontSize(12);
                                                        resultsTable.Cell().Element(ResultadoStyle).Text(resultado.IdparametroNavigation?.UnidadMedida ?? "").FontSize(12);
                                                        resultsTable.Cell().Element(ResultadoStyle).Text(resultado.IdparametroNavigation?.ValorReferencia ?? "").FontSize(12);
                                                    }
                                                }
                                            });
                                        }
                                    }

                                    // Mostrar la NOTA si existe y solo para los exámenes específicos
                                    if (notaParametro != null && !string.IsNullOrWhiteSpace(notaParametro.Resultado))
                                    {
                                        var nombreExamen = detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper();

                                        // Excluir UROCULTIVO completamente
                                        bool esUrocultivo = nombreExamen.Contains("UROCULTIVO");

                                        if (!esUrocultivo &&
                                            (nombreExamen.Contains("HEMATOLOGÍA") ||
                                             nombreExamen.Contains("QUÍMICA SANGUÍNEA") ||
                                             // Para la tabla estándar, verifica que no sea ninguno de los otros formatos especiales
                                             (!nombreExamen.Contains("EXÁMENES DIVERSOS") &&
                                              !nombreExamen.Contains("PARASITOLOGÍA") &&
                                              !nombreExamen.Contains("SEROLOGÍA") &&
                                              !nombreExamen.Contains("CITOLOGÍA FECAL") &&
                                              !nombreExamen.Contains("COAGULACIÓN"))))
                                        {
                                            column.Item().PaddingTop(10).Text(text =>
                                            {
                                                text.Span("NOTA: ").Bold();
                                                text.Span(notaParametro.Resultado);
                                            });
                                        }
                                    }


                                    // Actualizar estado para el próximo examen
                                    esPrimerExamenEnPagina = false;
                                    tablaAnterior = (currentColumns, currentHeaders);

                                    // Lógica de salto de página mejorada
                                    if (!esUltimoExamenEnOrden)
                                    {
                                        // Solo saltar página si el próximo examen no es pequeño o no cabe
                                        if (!agruparConSiguiente)
                                        {
                                            column.Item().PageBreak();
                                            datosPacienteMostradosEnPagina = false;
                                            tablaAnterior = null;
                                            esPrimerExamenEnPagina = true;
                                        }
                                    }
                                }

                                // Si no es la última orden, agregar separación
                                if (orden != ordenes.Last())
                                {
                                    column.Item().PageBreak();
                                    datosPacienteMostradosEnPagina = false;
                                    tablaAnterior = null;
                                    ordenActual = null;
                                    esPrimerExamenEnPagina = true;
                                }
                            }
                        });
                    });

                    // Método auxiliar local para determinar el tipo de tabla
                    (int columns, List<string> headers) DeterminarTipoTabla(string nombreExamen, bool esPrimerExamenEnOrden, bool puedenCaberEnUnaPagina, bool esPrimerExamenEnPagina)
                    {
                        if (nombreExamen.Contains("EXÁMENES DIVERSOS"))
                        {
                            return (3, new List<string> { "MUESTRA", "EXAMEN", "RESULTADO" });
                        }
                        else if (esPrimerExamenEnOrden || !puedenCaberEnUnaPagina || esPrimerExamenEnPagina)
                        {
                            // Mostrar encabezado completo cuando:
                            // 1. Es el primer examen de la orden, o
                            // 2. Los exámenes no caben en una sola página, o
                            // 3. Es el primer examen en la página actual
                            return (4, new List<string> { "ANÁLISIS", "RESULTADO", "", "VALORES DE REFERENCIA" });
                        }
                        else
                        {
                            // No mostrar encabezado para exámenes subsiguientes en la misma página
                            return (4, new List<string>());
                        }
                    }
                });

                var pdfBytes = document.GeneratePdf();
                var nombreArchivo = $"Reporte_Completo_{paciente.Nombre?.Replace(" ", "_")}_{DateTime.Now:yyyyMMdd}.pdf";

                return File(pdfBytes, "application/pdf", nombreArchivo);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al generar el reporte: {ex.Message}");
            }
        }


    }
}