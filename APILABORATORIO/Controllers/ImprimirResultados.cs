using APILABORATORIO.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using System;
using System.Linq;
using System.Threading.Tasks;

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

        // Endpoint para generar reporte de un examen específico
        [HttpGet("generar-reporte/{idDetalleOrden}")]
        public async Task<IActionResult> GenerarReporteExamen(int idDetalleOrden)
        {
            try
            {
                byte[] imageBytes = System.IO.File.ReadAllBytes(@"img\logo.jpeg");

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

                var resultadosFiltrados = detalleOrden.ResultadoExamen
                    .Where(r => !string.IsNullOrWhiteSpace(r.Resultado))
                    .OrderBy(r => r.IdparametroNavigation?.Subtitulo)
                    .ThenBy(r => r.NombreParametro)
                    .ToList();

                if (!resultadosFiltrados.Any())
                    return NotFound("No hay resultados válidos para este examen");

                var edad = detalleOrden.IdordenNavigation.IdclienteNavigation.FechaNacimiento.HasValue ?
                    DateTime.Now.Year - detalleOrden.IdordenNavigation.IdclienteNavigation.FechaNacimiento.Value.Year : 0;

                // Generar PDF
                var document = Document.Create(container =>
                {
                    container.Page(page =>
                    {
                        page.Size(PageSizes.A4);
                        page.Margin(30);
                        page.DefaultTextStyle(x => x.FontSize(10).FontFamily("Times New Roman"));

                        // Encabezado
                        page.Header().Row(row =>
                        {
                            row.RelativeItem(2).AlignLeft().Image(imageBytes, ImageScaling.FitWidth);
                            row.RelativeItem(8).Column(column =>
                            {
                                column.Item().AlignCenter().Text("Laboratorio Clínico Sangre de Cristo").Bold().FontSize(16);
                                column.Item().AlignCenter().Text("Lic. Miurell Gutiérrez Rivera").FontSize(12);
                                column.Item().AlignCenter().Text("Lic. Alvaro Bracamonte Nicaragua").FontSize(12);
                                column.Item().PaddingVertical(5);
                            });
                        });

                        // Pie de página CENTRADO
                        page.Footer().Column(column =>
                        {
                            // Add signature line before the footer
                            column.Item().AlignRight().PaddingBottom(5).Text("________________________").FontSize(10);
                            column.Item().PaddingTop(10).AlignCenter().Text("Tu confianza, es nuestra satisfacción").Italic().FontColor(Colors.Blue.Medium);
                            column.Item().AlignCenter().Text("Dirección: Casa natal de Rubén Darío 4 Cuadras al este, Ciudad Darío, Matagalpa.");
                            column.Item().AlignCenter().Text("Cel: 85052997");
                            column.Item().AlignCenter().Text("Correo electrónico: Labsandecris@gmail.com");
                        });

                        // Contenido
                        page.Content().Column(column =>
                        {
                            // Datos del paciente
                            column.Item().Row(row =>
                            {
                                row.RelativeItem().Text(text =>
                                {
                                    text.Span("Paciente: ").Bold();
                                    text.Span(detalleOrden.IdordenNavigation.IdclienteNavigation.Nombre ?? "N/A");
                                });

                                row.RelativeItem().AlignRight().Text(text =>
                                {
                                    text.Span("Sexo - Edad: ").Bold();
                                    text.Span($"{detalleOrden.IdordenNavigation.IdclienteNavigation.Genero ?? "N/A"} {edad} Años");
                                });
                            });

                            column.Item().Row(row =>
                            {
                                row.RelativeItem().Text(text =>
                                {
                                    text.Span("Médico: ").Bold();
                                    text.Span(detalleOrden.IdordenNavigation.IdmedicoNavigation?.Nombre ?? "N/A");
                                });

                                row.RelativeItem().AlignRight().Text(text =>
                                {
                                    text.Span("N° Muestra: ").Bold();
                                    text.Span(detalleOrden.IddetalleOrden.ToString());
                                });
                            });

                            column.Item().Row(row =>
                            {
                                row.RelativeItem().Text(text =>
                                {
                                    text.Span("Mx Recepcionado: ").Bold();
                                    text.Span(detalleOrden.IdordenNavigation.FechaOrden?.ToString("dd/MM/yyyy"));
                                });

                                row.RelativeItem().AlignRight().Text(text =>
                                {
                                    text.Span("Emisión: ").Bold();
                                    text.Span(detalleOrden.IdordenNavigation.FechaEntrega?.ToString("dd/MM/yyyy") ?? "N/A");
                                });
                            });

                            // Título del examen
                            column.Item().PaddingTop(15).Text(detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper()).Bold().FontSize(12);

                            // Tabla de resultados con nueva columna
                            column.Item().Table(table =>
                            {
                                // Configurar columnas (añadida columna para unidad de medida)
                                table.ColumnsDefinition(columns =>
                                {
                                    columns.RelativeColumn(3); // Parámetro
                                    columns.RelativeColumn();  // Resultado
                                    columns.RelativeColumn();  // Unidad de medida (nueva columna)
                                    columns.RelativeColumn(2); // Valor referencia
                                });

                                // Encabezados de tabla
                                table.Header(header =>
                                {
                                    header.Cell().Element(CellStyle).Text("ANÁLISIS").Bold();
                                    header.Cell().Element(CellStyle).Text("RESULTADO").Bold();
                                    header.Cell().Element(CellStyle).Text("").Bold(); // Nueva columna
                                    header.Cell().Element(CellStyle).Text("VALOR REFERENCIA").Bold();

                                    static IContainer CellStyle(IContainer container)
                                    {
                                        return container
                                            .BorderBottom(1)
                                            .Background("#ADD8E6")
                                            .BorderColor(Colors.Black)
                                            .PaddingVertical(5);
                                    }
                                });

                                // Descripción como subtítulo debajo del encabezado
                                if (!string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                {
                                    table.Cell().ColumnSpan(4).PaddingBottom(5).Text(detalleOrden.IdtipoExamenNavigation.Descripcion)
                                        .Bold().FontSize(10); // Changed from 9 to 10 to match other text
                                }

                                string currentSubtitulo = null;

                                // Resultados filtrados
                                foreach (var resultado in resultadosFiltrados)
                                {
                                    // Mostrar subtítulo si es diferente al anterior
                                    var subtitulo = resultado.IdparametroNavigation?.Subtitulo;
                                    if (subtitulo != currentSubtitulo)
                                    {
                                        table.Cell().ColumnSpan(4)
                                            .PaddingTop(5)
                                            .Text(subtitulo) 
                                            .Bold()
                                            .FontSize(10); // Changed from 9 to 10 to match description
                                        currentSubtitulo = subtitulo;
                                    }

                                    table.Cell().Element(CellStyle).Text(resultado.NombreParametro ?? "");
                                    table.Cell().Element(CellStyle).Text(resultado.Resultado ?? "");

                                    // Nueva celda para unidad de medida
                                    var unidad = resultado.IdparametroNavigation?.UnidadMedida ?? "";
                                    table.Cell().Element(CellStyle).Text(unidad);

                                    // Celda de valor de referencia (sin incluir la unidad)
                                    var referencia = resultado.IdparametroNavigation?.ValorReferencia ?? "";
                                    table.Cell().Element(CellStyle).Text(referencia);

                                    static IContainer CellStyle(IContainer container)
                                    {
                                        return container
                                            .BorderBottom(1)
                                            .BorderColor(Colors.Grey.Lighten2)
                                            .PaddingVertical(5);
                                    }
                                }
                            });

                            // Interpretación
                            var resultadosConInterpretacion = resultadosFiltrados
                                .Where(r => r.GetType().GetProperty("Interpretacion") != null &&
                                            !string.IsNullOrEmpty(r.GetType().GetProperty("Interpretacion")?.GetValue(r)?.ToString()))
                                .ToList();

                            if (resultadosConInterpretacion.Any())
                            {
                                column.Item().PaddingTop(10).Text("INTERPRETACIÓN:").Bold();
                                foreach (var interpretacion in resultadosConInterpretacion)
                                {
                                    column.Item().Text(interpretacion.GetType().GetProperty("Interpretacion")?.GetValue(interpretacion)?.ToString() ?? "N/A");
                                }
                            }
                        });
                    });
                });

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
                byte[] imageBytes = System.IO.File.ReadAllBytes(@"img\logo.jpeg");

                // Obtener todos los exámenes del paciente con resultados no vacíos
                var examenes = await _context.DetalleOrdens
                    .Include(d => d.IdordenNavigation)
                        .ThenInclude(o => o.IdclienteNavigation)
                    .Include(d => d.IdordenNavigation)
                        .ThenInclude(o => o.IdmedicoNavigation)
                    .Include(d => d.IdtipoExamenNavigation)
                    .Include(d => d.ResultadoExamen)
                        .ThenInclude(r => r.IdparametroNavigation)
                    .Where(d => d.IdordenNavigation.Idcliente == idCliente && d.IdordenNavigation.Estado == "COMPLETADO")
                    .Select(d => new
                    {
                        DetalleOrden = d,
                        ResultadosFiltrados = d.ResultadoExamen
                            .Where(r => !string.IsNullOrWhiteSpace(r.Resultado))
                            .OrderBy(r => r.IdparametroNavigation != null ? r.IdparametroNavigation.Subtitulo : "General")
                            .ThenBy(r => r.NombreParametro)
                            .ToList()
                    })
                    .Where(x => x.ResultadosFiltrados.Any())
                    .ToListAsync();

                if (examenes == null || !examenes.Any())
                    return NotFound("No se encontraron exámenes con resultados para este paciente");

                // Obtener datos del cliente
                var primerExamen = examenes.First().DetalleOrden;
                var paciente = primerExamen.IdordenNavigation.IdclienteNavigation;
                var edad = paciente.FechaNacimiento.HasValue ?
                    DateTime.Now.Year - paciente.FechaNacimiento.Value.Year : 0;

                // Generar PDF
                var document = Document.Create(container =>
                {
                    container.Page(page =>
                    {
                        page.Size(PageSizes.A4);
                        page.Margin(30);
                        page.DefaultTextStyle(x => x.FontSize(10).FontFamily("Times New Roman"));

                        // Encabezado
                        page.Header().Row(row =>
                        {
                            row.RelativeItem(2).AlignLeft().Image(imageBytes, ImageScaling.FitWidth);
                            row.RelativeItem(8).Column(column =>
                            {
                                column.Item().AlignCenter().Text("Laboratorio Clínico Sangre de Cristo").Bold().FontSize(16);
                                column.Item().AlignCenter().Text("Lic. Miurell Gutiérrez Rivera").FontSize(12);
                                column.Item().AlignCenter().Text("Lic. Alvaro Bracamonte Nicaragua").FontSize(12);
                                column.Item().PaddingVertical(5);
                            });
                        });

                        // Pie de página CENTRADO
                        page.Footer().Column(column =>
                        {
                            // Add signature line before the footer
                            column.Item().AlignRight().PaddingBottom(5).Text("________________________").FontSize(10);
                            column.Item().PaddingTop(10).AlignCenter().Text("Tu confianza, es nuestra satisfacción").Italic().FontColor(Colors.Blue.Medium);
                            column.Item().AlignCenter().Text("Dirección: Casa natal de Rubén Darío 4 Cuadras al este, Ciudad Darío, Matagalpa.");
                            column.Item().AlignCenter().Text("Cel: 85052997");
                            column.Item().AlignCenter().Text("Correo electrónico: Labsandecris@gmail.com");
                        });

                        // Contenido
                        page.Content().Column(column =>
                        {
                            // Datos del paciente (igual que en el reporte específico)
                            column.Item().Row(row =>
                            {
                                row.RelativeItem().Text(text =>
                                {
                                    text.Span("Paciente: ").Bold();
                                    text.Span(paciente.Nombre ?? "N/A");
                                });

                                row.RelativeItem().AlignRight().Text(text =>
                                {
                                    text.Span("Sexo - Edad: ").Bold();
                                    text.Span($"{paciente.Genero ?? "N/A"} {edad} Años");
                                });
                            });

                            column.Item().Row(row =>
                            {
                                row.RelativeItem().Text(text =>
                                {
                                    text.Span("Médico: ").Bold();
                                    text.Span(primerExamen.IdordenNavigation.IdmedicoNavigation?.Nombre ?? "N/A");
                                });

                                row.RelativeItem().AlignRight().Text(text =>
                                {
                                    text.Span("N° Muestra: ").Bold();
                                    text.Span(primerExamen.IddetalleOrden.ToString());
                                });
                            });

                            column.Item().Row(row =>
                            {
                                row.RelativeItem().Text(text =>
                                {
                                    text.Span("Mx Recepcionado: ").Bold();
                                    text.Span(primerExamen.IdordenNavigation.FechaOrden?.ToString("dd/MM/yyyy"));
                                });

                                row.RelativeItem().AlignRight().Text(text =>
                                {
                                    text.Span("Emisión: ").Bold();
                                    text.Span(primerExamen.IdordenNavigation.FechaEntrega?.ToString("dd/MM/yyyy") ?? "N/A");
                                });
                            });

                            // Bucle para cada examen con resultados
                            foreach (var examen in examenes)
                            {
                                var detalleOrden = examen.DetalleOrden;
                                var resultadosFiltrados = examen.ResultadosFiltrados;

                                // Título del examen
                                column.Item().PaddingTop(15).Text(detalleOrden.IdtipoExamenNavigation.NombreExamen.ToUpper())
                                    .Bold().FontSize(12);

                                // Tabla de resultados
                                column.Item().Table(table =>
                                {
                                    // Configurar columnas
                                    table.ColumnsDefinition(columns =>
                                    {
                                        columns.RelativeColumn(3); // Parámetro
                                        columns.RelativeColumn();  // Resultado
                                        columns.RelativeColumn();  // Unidad de medida
                                        columns.RelativeColumn(2); // Valor referencia
                                    });

                                    // Encabezados de tabla
                                    table.Header(header =>
                                    {
                                        header.Cell().Element(CellStyle).Text("ANÁLISIS").Bold();
                                        header.Cell().Element(CellStyle).Text("RESULTADO").Bold();
                                        header.Cell().Element(CellStyle).Text("").Bold();
                                        header.Cell().Element(CellStyle).Text("VALOR REFERENCIA").Bold();

                                        static IContainer CellStyle(IContainer container)
                                        {
                                            return container
                                                .BorderBottom(1)
                                                .Background("#ADD8E6")
                                                .BorderColor(Colors.Black)
                                                .PaddingVertical(5);
                                        }
                                    });

                                    // Descripción del examen
                                    if (!string.IsNullOrEmpty(detalleOrden.IdtipoExamenNavigation.Descripcion))
                                    {
                                        table.Cell().ColumnSpan(4).PaddingBottom(5).Text(detalleOrden.IdtipoExamenNavigation.Descripcion)
                                            .Bold().FontSize(10); // Changed from 9 to 10
                                    }

                                    string currentSubtitulo = null;

                                    // Resultados del examen
                                    foreach (var resultado in resultadosFiltrados)
                                    {
                                        // Mostrar subtítulo si es diferente al anterior
                                        var subtitulo = resultado.IdparametroNavigation?.Subtitulo;
                                        if (subtitulo != currentSubtitulo)
                                        {
                                            table.Cell().ColumnSpan(4)
                                                .PaddingTop(5)
                                                .Text(subtitulo) // Removed background color
                                                .Bold()
                                                .FontSize(10); // Changed from 9 to 10
                                            currentSubtitulo = subtitulo;
                                        }

                                        table.Cell().Element(CellStyle).Text(resultado.NombreParametro ?? "");
                                        table.Cell().Element(CellStyle).Text(resultado.Resultado ?? "");
                                        table.Cell().Element(CellStyle).Text(resultado.IdparametroNavigation?.UnidadMedida ?? "");
                                        table.Cell().Element(CellStyle).Text(resultado.IdparametroNavigation?.ValorReferencia ?? "");

                                        static IContainer CellStyle(IContainer container)
                                        {
                                            return container
                                                .BorderBottom(1)
                                                .BorderColor(Colors.Grey.Lighten2)
                                                .PaddingVertical(5);
                                        }
                                    }
                                });

                                // Interpretación si está disponible
                                var resultadosConInterpretacion = resultadosFiltrados
                                    .Where(r => r.GetType().GetProperty("Interpretacion") != null &&
                                                !string.IsNullOrEmpty(r.GetType().GetProperty("Interpretacion")?.GetValue(r)?.ToString()))
                                    .ToList();

                                if (resultadosConInterpretacion.Any())
                                {
                                    column.Item().PaddingTop(10).Text("INTERPRETACIÓN:").Bold();
                                    foreach (var interpretacion in resultadosConInterpretacion)
                                    {
                                        column.Item().Text(interpretacion.GetType().GetProperty("Interpretacion")?.GetValue(interpretacion)?.ToString() ?? "N/A");
                                    }
                                }

                                // Espacio entre exámenes
                                column.Item().PaddingBottom(20);
                            }
                        });
                    });
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