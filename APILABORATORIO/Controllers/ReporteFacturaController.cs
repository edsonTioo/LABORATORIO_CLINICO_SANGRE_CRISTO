using APILABORATORIO.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using System.IO;
using System.Linq;
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
                        .ThenInclude(df => df.IddetalleOrdenNavigation)
                            .ThenInclude(ido => ido.IdtipoExamenNavigation)
                    .FirstOrDefaultAsync(f => f.Idfactura == id);

                if (factura == null)
                    return NotFound("Factura no encontrada");

                // Cargar imagen del logo
                var logoPath = Path.Combine(Directory.GetCurrentDirectory(), @"img\logo.jpeg");
                var logoExists = System.IO.File.Exists(logoPath);
                byte[] logoBytes = logoExists ? System.IO.File.ReadAllBytes(logoPath) : null;

                var document = Document.Create(container =>
                {
                    container.Page(page =>
                    {
                        page.Size(PageSizes.A4);
                        page.Margin(30);
                        page.DefaultTextStyle(x => x.FontFamily("Times New Roman").FontSize(10));

                        // Encabezado
                        page.Header().Element(ComposeHeader);

                        // Contenido
                        page.Content().Element(ComposeContent);

                        // Pie de página
                        page.Footer().Element(ComposeFooter);

                        void ComposeHeader(IContainer container)
                        {
                            container.Column(column =>
                            {
                                column.Item().Row(row =>
                                {
                                    if (logoExists)
                                    {
                                        row.RelativeItem(2).AlignLeft().Image(logoBytes, ImageScaling.FitWidth);
                                    }

                                    row.RelativeItem(8).Column(infoColumn =>
                                    {
                                        infoColumn.Item().AlignCenter().Text("Laboratorio Clínico Sangre de Cristo")
                                            .FontSize(16).Bold().FontColor(Colors.Blue.Darken3);

                                        infoColumn.Item().AlignCenter().Text("Lic. Miurell Gutiérrez Rivera").FontSize(12);
                                        infoColumn.Item().AlignCenter().Text("Lic. Alvaro Bracamonte Nicaragua").FontSize(12);
                                        infoColumn.Item().PaddingVertical(5);
                                    });
                                });

                                column.Item().PaddingBottom(5).BorderBottom(1).BorderColor(Colors.Grey.Lighten1);
                            });
                        }

                        void ComposeContent(IContainer container)
                        {
                            container.Column(mainColumn =>
                            {
                                // Título
                                mainColumn.Item().AlignCenter().Text("FACTURA")
                                    .FontSize(16).Bold().FontColor(Colors.Blue.Darken3);

                                mainColumn.Item().PaddingBottom(10).LineHorizontal(1).LineColor(Colors.Grey.Lighten1);

                                // Información de factura y cliente
                                mainColumn.Item().Row(row =>
                                {
                                    row.RelativeItem().Column(col =>
                                    {
                                        col.Item().Text(text => {
                                            text.Span("No. Factura: ").Bold();
                                            text.Span(factura.Idfactura.ToString());
                                        });
                                        col.Item().Text(text => {
                                            text.Span("Fecha: ").Bold();
                                            text.Span(factura.FechaFactura?.ToString("dd/MM/yyyy") ?? "Sin fecha");
                                        });
                                    });

                                    row.RelativeItem().Column(col =>
                                    {
                                        col.Item().Text("Cliente:").Bold();
                                        col.Item().Text(factura.IdclienteNavigation?.Nombre ?? "Sin nombre");
                                        col.Item().Text(factura.IdclienteNavigation?.Telefono ?? "Sin teléfono");
                                    });
                                });

                                mainColumn.Item().PaddingVertical(5).LineHorizontal(1).LineColor(Colors.Grey.Lighten1);

                                // Tabla de detalles
                                mainColumn.Item().Table(table =>
                                {
                                    table.ColumnsDefinition(columns =>
                                    {
                                        columns.ConstantColumn(20);
                                        columns.RelativeColumn(4);
                                        columns.ConstantColumn(60);
                                        columns.ConstantColumn(40);
                                        columns.ConstantColumn(70);
                                    });

                                    table.Header(header =>
                                    {
                                        header.Cell().Background("#ADD8E6").Padding(3).Text("#").FontColor(Colors.Black).Bold();
                                        header.Cell().Background("#ADD8E6").Padding(3).Text("Examen").FontColor(Colors.Black).Bold();
                                        header.Cell().Background("#ADD8E6").Padding(3).Text("Precio").FontColor(Colors.Black).Bold();
                                        header.Cell().Background("#ADD8E6").Padding(3).Text("Cant.").FontColor(Colors.Black).Bold();
                                        header.Cell().Background("#ADD8E6").Padding(3).Text("Subtotal").FontColor(Colors.Black).Bold();
                                    });

                                    int itemNumber = 1;
                                    foreach (var detalle in factura.DetalleFacturas)
                                    {
                                        var examen = detalle.IddetalleOrdenNavigation?.IdtipoExamenNavigation;
                                        var precio = examen?.Precio ?? 0;
                                        var cantidad = 1;
                                        var subtotal = precio * cantidad;

                                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(3).Text(itemNumber++);
                                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(3).Text(examen?.NombreExamen ?? "Sin nombre");
                                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(3).AlignRight().Text($"C$ {precio:N2}");
                                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(3).AlignCenter().Text($"{cantidad}");
                                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(3).AlignRight().Text($"C$ {subtotal:N2}");
                                    }
                                });

                                // Total
                                decimal total = factura.DetalleFacturas
                                    .Sum(d => d.IddetalleOrdenNavigation?.IdtipoExamenNavigation?.Precio ?? 0);

                                mainColumn.Item().AlignRight().PaddingTop(15).Row(row =>
                                {
                                    row.RelativeItem().Text("Total a Pagar:").Bold().FontSize(12);
                                    row.ConstantItem(80).AlignRight().Text($"C$ {total:N2}").Bold().FontSize(12);
                                });
                            });
                        }

                        void ComposeFooter(IContainer container)
                        {
                            container.Column(column =>
                            {
                                column.Item().PaddingTop(20).AlignCenter().Text("Tu confianza, es nuestra satisfacción").Italic();
                                column.Item().PaddingTop(10).AlignCenter().Text("Dirección: Casa natal de Rubén Darío 4 Cuadras al este, Ciudad Darío, Matagalpa.");
                                column.Item().AlignCenter().Text("Cel: 85052997");
                                column.Item().AlignCenter().Text("Correo electrónico: Labsandecris@gmail.com");
                                column.Item().PaddingTop(10).AlignCenter().Text("Factura electrónica - No requiere firma").FontSize(9);
                            });
                        }
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