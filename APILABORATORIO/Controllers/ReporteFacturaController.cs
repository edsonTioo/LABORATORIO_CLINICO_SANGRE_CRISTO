using APILABORATORIO.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;

namespace LaboratorioClinico.Controllers
{
    
    [ApiController]
    [Route("api/[controller]")]
    public class ReporteFacturaController : ControllerBase
    {
        private readonly LaboratorioClinicoContext _context;

        public ReporteFacturaController(LaboratorioClinicoContext context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
        }

        [HttpGet("factura/{id}")]
        public async Task<IActionResult> GenerarFacturaPDF(int id)
        {
            if (_context == null)
                return StatusCode(500, "Error interno: contexto de base de datos no disponible");

            try
            {
                var factura = await _context.Facturas
                    .Include(f => f.IdclienteNavigation)
                    .Include(f => f.DetalleFacturas)
                    .FirstOrDefaultAsync(f => f.Idfactura == id);

                if (factura == null)
                    return NotFound("Factura no encontrada");

                // Cálculo dinámico de altura
                int lineasEncabezado = 8;
                int lineasPorItem = 1;
                int lineasPie = 5;
                int totalLineas = lineasEncabezado + factura.DetalleFacturas.Count * lineasPorItem + lineasPie;
                int alturaPorLinea = 20; // Aumentado para más espacio
                int margenAdicional = 100; // Aumentado para más espacio
                int alturaPagina = totalLineas * alturaPorLinea + margenAdicional;

                // Límites de altura (mínimo 400pt, máximo 2000pt)
                alturaPagina = Math.Clamp(alturaPagina, 400, 2000);

                // Obtener la ruta de la imagen
                var exePath = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
                var imagePath = Path.Combine(exePath, "img", "logofactura.bmp");
                byte[] imageBytes = System.IO.File.Exists(imagePath) ? System.IO.File.ReadAllBytes(imagePath) : null;

                var document = Document.Create(container =>
                {
                    container.Page(page =>
                    {
                        // Tamaño dinámico para impresora térmica (80mm de ancho)
                        page.Size(new PageSize(226, alturaPagina));
                        page.Margin(10);
                        page.DefaultTextStyle(x => x.FontFamily("Courier New").FontSize(10));

                        // Encabezado con imagen y balance perfecto
                        page.Header().Element(container =>
                        {
                            container.Row(row =>
                            {
                                // Columna izquierda con la imagen (30px ancho, 100px alto)
                                if (imageBytes != null)
                                {
                                    row.ConstantItem(30).Height(100).AlignLeft().Image(imageBytes, ImageScaling.FitArea);
                                }

                                // Columna central con el contenido centrado
                                row.RelativeItem().Column(column =>
                                {
                                    column.Item().AlignCenter().Text("LABORATORIO CLINICO").Bold().FontSize(12);
                                    column.Item().AlignCenter().Text("SANGRE DE CRISTO").Bold().FontSize(12);
                                    column.Item().ExtendHorizontal().AlignCenter().Text("------------------------").FontSize(10);
                                    column.Item().AlignCenter().Text("FACTURA").Bold().FontSize(12);
                                    column.Item().AlignCenter().Text($"No: {factura.Idfactura}").FontSize(10);
                                    column.Item().AlignCenter().Text($"Fecha: {factura.FechaFactura?.ToString("dd/MM/yyyy") ?? "Sin fecha"}").FontSize(10);
                                    column.Item().ExtendHorizontal().AlignCenter().Text("------------------------").FontSize(10);
                                });

                                // Espacio en la derecha equivalente al ancho de la imagen (30px)
                                row.ConstantItem(30);
                            });
                        });

                        // Resto del contenido permanece igual
                        page.Content().Element(container =>
                        {
                            container.Column(mainColumn =>
                            {
                                // Información del cliente
                                mainColumn.Item().Text($"Cliente: {factura.IdclienteNavigation?.Nombre ?? "Sin nombre"}").FontSize(10);
                                mainColumn.Item().PaddingBottom(5).Text("----------------------------------").FontSize(10);

                                // Tabla de detalles
                                mainColumn.Item().Table(table =>
                                {
                                    table.ColumnsDefinition(columns =>
                                    {
                                        columns.RelativeColumn(3); // Análisis
                                        columns.RelativeColumn(1); // Precio
                                    });

                                    table.Header(header =>
                                    {
                                        header.Cell().Text("ANALISIS").Bold().FontSize(10);
                                        header.Cell().AlignRight().Text("PRECIO").Bold().FontSize(10);
                                    });

                                    foreach (var detalle in factura.DetalleFacturas)
                                    {
                                        table.Cell().PaddingBottom(3).Text(detalle.NombreParametro ?? "Sin nombre").FontSize(10);
                                        table.Cell().PaddingBottom(3).AlignRight().Text($"C$ {detalle.Precio:N2}").FontSize(10);
                                    }
                                });

                                mainColumn.Item().PaddingTop(5).Text("----------------------------------").FontSize(10);

                                // Total
                                decimal total = factura.DetalleFacturas.Sum(d => d.Subtotal ?? 0);
                                mainColumn.Item().PaddingTop(5).Row(row =>
                                {
                                    row.RelativeItem().Text("TOTAL:").Bold().FontSize(10);
                                    row.ConstantItem(80).AlignRight().Text($"C$ {total:N2}").Bold().FontSize(10);
                                });

                                // Espacio flexible para empujar el pie de página hacia abajo
                                mainColumn.Item().MinimalBox().AlignBottom();
                            });
                        });

                        // Pie de página y corte de hoja
                        page.Footer().Column(footerColumn =>
                {
                    footerColumn.Item().PaddingTop(10).AlignCenter().Text("Gracias por su preferencia").Italic().FontSize(10);
                    footerColumn.Item().AlignCenter().Text("Lab. Sangre de Cristo").FontSize(10);
                    footerColumn.Item().AlignCenter().Text("Cel: 85052997").FontSize(8);

                    // Comandos para corte de papel
                    footerColumn.Item().AlignCenter().Text(text =>
                    {
                        // Avanzar 2 líneas antes del corte
                        text.Span(new string(new char[] { (char)27, (char)100, (char)2 }));

                        // Comando de corte completo
                        text.Span(new string(new char[] { (char)29, (char)86, (char)65, (char)0 }));
                    });
                });
                    });
                });

                var pdfBytes = document.GeneratePdf();
                return File(pdfBytes, "application/pdf", $"Factura_{factura.Idfactura}.pdf");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al generar la factura: {ex.Message}");
            }
        }
    }
}