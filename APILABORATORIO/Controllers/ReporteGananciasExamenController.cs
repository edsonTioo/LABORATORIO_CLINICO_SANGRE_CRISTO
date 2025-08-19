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
    public class ReporteGananciasExamenController : ControllerBase
    {
        private readonly LaboratorioClinicoContext _context;

        public ReporteGananciasExamenController(LaboratorioClinicoContext context)
        {
            _context = context;
        }

        // DTO privado para este controlador
        private class IngresoExamenDto
        {
            public string NombreParametro { get; set; } = string.Empty;
            public int CantidadRealizada { get; set; }
            public decimal PrecioUnitario { get; set; }
            public decimal TotalGenerado { get; set; }
        }

        [HttpGet("reporte-ingresos")]
        public async Task<IActionResult> GenerarReporteIngresos([FromQuery] DateTime fechaInicio, [FromQuery] DateTime fechaFin)
        {
            // Cargamos los datos necesarios incluyendo DetalleFacturas
            var datos = await _context.DetalleFacturas
                .Include(df => df.IddetalleOrdenNavigation)
                .ThenInclude(d => d.IdordenNavigation)
                .Where(df => df.IddetalleOrdenNavigation.IdordenNavigation.FechaOrden >= fechaInicio &&
                             df.IddetalleOrdenNavigation.IdordenNavigation.FechaOrden <= fechaFin)
                .ToListAsync();
            // Procesamos los datos en memoria
            var ingresos = datos
                .GroupBy(df => df.NombreParametro)
                .Select(g => new IngresoExamenDto
                {
                    NombreParametro = g.Key,
                    CantidadRealizada = g.Count(),
                    PrecioUnitario = g.Sum(df => df.Precio ?? 0),
                    TotalGenerado = g.Sum(df => df.Precio ?? 0)
                })
                .ToList();

            var pdfBytes = GeneratePdf(ingresos, fechaInicio, fechaFin);

            return File(pdfBytes, "application/pdf", "Reporte_Ganancias_Examenes.pdf");
        }

        private byte[] GeneratePdf(List<IngresoExamenDto> ingresos, DateTime fechaInicio, DateTime fechaFin)
        {
            var cultura = new CultureInfo("es-NI");

            var exePath = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
            var imagePath = Path.Combine(exePath, "img", "logo.jpeg");
            byte[] imageBytes = System.IO.File.ReadAllBytes(imagePath);

            var documento = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Margin(30);
                    page.Size(PageSizes.A4);
                    page.PageColor(Colors.White);
                    page.DefaultTextStyle(x => x.FontSize(12));

                    page.Header().Row(row =>
                    {
                        row.ConstantItem(80).Image(imageBytes); // Aquí mostramos el logo
                        row.RelativeItem().Column(col =>
                        {
                            col.Item().Text("REPORTE DE GANANCIAS POR TIPO DE EXAMEN")
                                .SemiBold().FontSize(18).FontColor(Colors.Blue.Medium);
                            col.Item().Text($"Desde: {fechaInicio:dd/MM/yyyy}     Hasta: {fechaFin:dd/MM/yyyy}")
                                .FontSize(12).FontColor(Colors.Grey.Darken1);
                        });
                    });

                    page.Content()
                        .PaddingVertical(10)
                        .Column(col =>
                        {
                            col.Item().Text($"Desde: {fechaInicio:dd/MM/yyyy}     Hasta: {fechaFin:dd/MM/yyyy}")
                                .FontSize(12).FontColor(Colors.Grey.Darken1);

                            col.Item().Table(table =>
                            {
                                // Columnas
                                table.ColumnsDefinition(columns =>
                                {
                                    columns.RelativeColumn();
                                    columns.ConstantColumn(60);
                                    columns.ConstantColumn(80);
                                    columns.ConstantColumn(100);
                                });

                                // Encabezado
                                table.Header(header =>
                                {
                                    header.Cell().Element(CellStyle).Text("Examen").SemiBold();
                                    header.Cell().Element(CellStyle).AlignRight().Text("Cant.");
                                    header.Cell().Element(CellStyle).AlignRight().Text("Precio");
                                    header.Cell().Element(CellStyle).AlignRight().Text("Total");

                                    IContainer CellStyle(IContainer container) =>
                                        container.DefaultTextStyle(x => x.SemiBold()).Padding(5).Background(Colors.Grey.Lighten3).BorderBottom(1).BorderColor(Colors.Grey.Lighten1);
                                });

                                // Filas de datos
                                foreach (var ingreso in ingresos)
                                {
                                    table.Cell().Element(CellStyle).Text(ingreso.NombreParametro);
                                    table.Cell().Element(CellStyle).AlignRight().Text(ingreso.CantidadRealizada.ToString());
                                    table.Cell().Element(CellStyle).AlignRight().Text(ingreso.PrecioUnitario.ToString("C", cultura));
                                    table.Cell().Element(CellStyle).AlignRight().Text(ingreso.TotalGenerado.ToString("C", cultura));

                                    IContainer CellStyle(IContainer container) =>
                                        container.Padding(5).BorderBottom(1).BorderColor(Colors.Grey.Lighten2);
                                }

                                // Total general
                                var total = ingresos.Sum(x => x.TotalGenerado);
                                table.Cell().ColumnSpan(3).AlignRight().PaddingTop(10).Text("Total General:");

                                table.Cell()
                                    .AlignRight()
                                    .PaddingTop(10)
                                    .Text(total.ToString("C", cultura))
                                    .FontSize(12)
                                    .SemiBold();
                            });
                        });

                    page.Footer()
                        .AlignCenter()
                        .Text(txt =>
                        {
                            txt.Span("Laboratorio Clínico Sangre de Cristo").SemiBold();
                            txt.Span($"Generado el {DateTime.Now:dd/MM/yyyy HH:mm}")
                                .FontSize(10).FontColor(Colors.Grey.Darken1);
                        });
                });
            });

            return documento.GeneratePdf();
        }
    }
}