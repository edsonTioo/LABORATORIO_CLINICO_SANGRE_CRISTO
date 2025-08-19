using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using APILABORATORIO.Models;
using System.Globalization;
using System.Reflection;

namespace LaboratorioClinico.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReporteGananciasController : ControllerBase
    {
        private readonly LaboratorioClinicoContext _context;
        private readonly IWebHostEnvironment _env;

        public ReporteGananciasController(LaboratorioClinicoContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
            QuestPDF.Settings.License = LicenseType.Community; // Inicializar licencia
        }

        [HttpGet("generar")]
        public async Task<IActionResult> GenerarReporteGanancias(
            [FromQuery] string fechaInicio, 
            [FromQuery] string fechaFin)
        {
            try
            {
                // Validar y parsear fechas
                if (!DateTime.TryParse(fechaInicio, out DateTime inicio) ||
                    !DateTime.TryParse(fechaFin, out DateTime fin))
                {
                    return BadRequest("Formato de fecha inválido. Use YYYY-MM-DD");
                }

                // Ajustar fecha fin para incluir todo el día
                fin = fin.Date.AddDays(1).AddSeconds(-1);

                var ganancias = await _context.Facturas
                    .Where(f => f.FechaFactura >= inicio && f.FechaFactura <= fin)
                    .Select(f => new 
                    {
                        FechaFactura = f.FechaFactura ?? DateTime.MinValue,
                        Total = f.Total ?? 0
                    })
                    .ToListAsync();

                if (!ganancias.Any())
                {
                    return NotFound("No se encontraron facturas en el rango de fechas especificado");
                }

                // Generar PDF
                var pdfBytes = GeneratePdf(ganancias, inicio, fin);
                return File(pdfBytes, "application/pdf", $"ReporteGanancias_{inicio:yyyyMMdd}_{fin:yyyyMMdd}.pdf");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al generar el reporte: {ex.Message}");
            }
        }

        private byte[] GeneratePdf(IEnumerable<dynamic> ganancias, DateTime fechaInicio, DateTime fechaFin)
        {
            var cultura = new CultureInfo("es-NI");
            var exePath = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
            var imagePath = Path.Combine(exePath, "img", "logo.jpeg");
            byte[] imageBytes = System.IO.File.ReadAllBytes(imagePath);

            return Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Margin(30);
                    page.Size(PageSizes.A4);
                    page.DefaultTextStyle(x => x.FontSize(11));

                    // Encabezado
                    page.Header().Column(col =>
                    {
                        if (imageBytes.Length > 0)
                        {
                            col.Item().Row(row =>
                            {
                                row.ConstantItem(80).Image(imageBytes);
                                row.RelativeItem().AlignCenter().Text("REPORTE DE GANANCIAS").Bold().FontSize(16);
                            });
                        }
                        else
                        {
                            col.Item().AlignCenter().Text("REPORTE DE GANANCIAS").Bold().FontSize(16);
                        }

                        col.Item().AlignCenter().Text($"Del {fechaInicio:dd/MM/yyyy} al {fechaFin:dd/MM/yyyy}");
                        col.Item().PaddingBottom(5).LineHorizontal(1);
                    });

                    // Contenido
                    page.Content().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(); // Fecha
                            columns.RelativeColumn(); // Día
                            columns.RelativeColumn(); // Semana
                            columns.RelativeColumn(); // Mes
                            columns.ConstantColumn(100); // Total
                        });

                        // Encabezados de tabla
                        table.Header(header =>
                        {
                            header.Cell().Element(CellStyle).Text("Fecha");
                            header.Cell().Element(CellStyle).Text("Día");
                            header.Cell().Element(CellStyle).Text("Semana");
                            header.Cell().Element(CellStyle).Text("Mes");
                            header.Cell().Element(CellStyle).AlignRight().Text("Total");

                            static IContainer CellStyle(IContainer container) =>
                                container.Background(Colors.Grey.Lighten3)
                                    .Padding(5)
                                    .BorderBottom(1)
                                    .BorderColor(Colors.Grey.Lighten1);
                        });

                        // Datos
                        foreach (var g in ganancias)
                        {
                            table.Cell().Element(CellStyle).Text(((DateTime)g.FechaFactura).ToString("dd/MM/yyyy"));
                            table.Cell().Element(CellStyle).Text(((DateTime)g.FechaFactura).Day.ToString());
                            table.Cell().Element(CellStyle).Text(
                                CultureInfo.CurrentCulture.Calendar.GetWeekOfYear(
                                    (DateTime)g.FechaFactura, 
                                    CalendarWeekRule.FirstFourDayWeek, 
                                    DayOfWeek.Monday).ToString());
                            table.Cell().Element(CellStyle).Text(((DateTime)g.FechaFactura).ToString("MMMM", cultura));
                            table.Cell().Element(CellStyle).AlignRight().Text(((decimal)g.Total).ToString("C", cultura));

                            static IContainer CellStyle(IContainer container) =>
                                container.Padding(5).BorderBottom(1).BorderColor(Colors.Grey.Lighten2);
                        }

                        // Total
                        var total = ganancias.Sum(g => (decimal)g.Total);
                        table.Cell().ColumnSpan(4).Element(container =>
                            container.Padding(5)
                                     .BorderBottom(1)
                                     .BorderColor(Colors.Grey.Lighten2))
                            .AlignRight()
                            .Text("TOTAL GENERAL:")
                            .SemiBold();
                        table.Cell().Element(container =>
                            container.Padding(5)
                                     .BorderBottom(1)
                                     .BorderColor(Colors.Grey.Lighten2))
                            .AlignRight()
                            .Text(total.ToString("C", cultura))
                            .SemiBold();
                    });

                    // Pie de página
                    page.Footer().AlignCenter().Text(txt =>
                    {
                        txt.Span("Generado: ").FontColor(Colors.Grey.Medium);
                        txt.Span(DateTime.Now.ToString("dd/MM/yyyy HH:mm")).FontSize(10);
                    });
                });
            }).GeneratePdf();
        }
    }
}