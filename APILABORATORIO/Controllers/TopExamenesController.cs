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
    public class TopExamenesController : ControllerBase
    {
        private readonly LaboratorioClinicoContext _context;

        public TopExamenesController(LaboratorioClinicoContext context)
        {
            _context = context;
        }

        // 1. Obtener datos en JSON
        [HttpGet("top-examenes")]
        public async Task<IActionResult> ObtenerTopExamenes(DateTime fechaInicio, DateTime fechaFin, int top = 5)
        {
        var query = await _context.DetalleFacturas
    .Include(df => df.IdfacturaNavigation) // Incluir Factura
    .Include(df => df.IddetalleOrdenNavigation) // Incluir DetalleOrden
        .ThenInclude(ido => ido.IdtipoExamenNavigation) // Incluir TipoExamen desde DetalleOrden
    .Where(df => df.IdfacturaNavigation.FechaFactura >= fechaInicio && df.IdfacturaNavigation.FechaFactura <= fechaFin)
    .GroupBy(df => new { df.IddetalleOrdenNavigation.IdtipoExamenNavigation.NombreExamen }) // Agrupar por NombreExamen
    .Select(g => new
    {
        NombreExamen = g.Key.NombreExamen,
        TotalRealizados = g.Count()
    })
    .OrderByDescending(x => x.TotalRealizados)
    .Take(top)
    .ToListAsync();


            return Ok(query);
        }

        // 2. Generar PDF
      [HttpGet("top-examenes-pdf")]
public async Task<IActionResult> ObtenerTopExamenesPdf(DateTime fechaInicio, DateTime fechaFin, int top = 5)
{
    try
    {
        var topExamenes = await _context.DetalleFacturas
            .Include(df => df.IdfacturaNavigation)
            .Include(df => df.IddetalleOrdenNavigation)
                .ThenInclude(ido => ido.IdtipoExamenNavigation)
            .Where(df => df.IdfacturaNavigation.FechaFactura >= fechaInicio && df.IdfacturaNavigation.FechaFactura <= fechaFin)
            .GroupBy(df => new { df.IddetalleOrdenNavigation.IdtipoExamenNavigation.NombreExamen })
            .Select(g => new
            {
                NombreExamen = g.Key.NombreExamen,
                TotalRealizados = g.Count()
            })
            .OrderByDescending(x => x.TotalRealizados)
            .Take(top)
            .ToListAsync();

        // Leer el logo desde la ruta física
        var logoPath = Path.Combine(Directory.GetCurrentDirectory(), "img", "logo.jpeg");
        var logoBytes = System.IO.File.ReadAllBytes(logoPath);

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(30);
                page.DefaultTextStyle(x => x.FontSize(12));
                page.PageColor(Colors.White);

                page.Header().Column(col =>
                {
                    col.Item().Row(row =>
                    {
                        row.ConstantItem(80).Image(logoBytes); // Logo como byte array
                        row.RelativeItem().AlignCenter().Text(text =>
                        {
                            text.Span("Laboratorio Clínico Central").FontSize(18).Bold();
                            text.Line("Reporte de Exámenes Más Realizados").FontSize(14);
                            text.Line($"Desde {fechaInicio:dd/MM/yyyy} hasta {fechaFin:dd/MM/yyyy}").FontSize(12);
                        });
                    });
                    col.Item().PaddingVertical(10).LineHorizontal(1);
                });

                page.Content().PaddingVertical(10).Table(table =>
                {
                    table.ColumnsDefinition(columns =>
                    {
                        columns.ConstantColumn(50);   // #
                        columns.RelativeColumn();     // Examen
                        columns.ConstantColumn(100);  // Total
                    });

                    // Encabezado
                    table.Header(header =>
                    {
                        header.Cell().Element(CellHeader).Text("#");
                        header.Cell().Element(CellHeader).Text("Examen");
                        header.Cell().Element(CellHeader).Text("Total Realizados");
                    });

                    int contador = 1;
                    foreach (var examen in topExamenes)
                    {
                        table.Cell().Element(CellBody).Text(contador++.ToString());
                        table.Cell().Element(CellBody).Text(examen.NombreExamen);
                        table.Cell().Element(CellBody).AlignRight().Text(examen.TotalRealizados.ToString());
                    }

                    static IContainer CellHeader(IContainer container) => container
                        .Background(Colors.Grey.Lighten2)
                        .Padding(5)
                        .BorderBottom(1)
                        .DefaultTextStyle(x => x.SemiBold());

                    static IContainer CellBody(IContainer container) => container
                        .PaddingVertical(5)
                        .PaddingHorizontal(5)
                        .BorderBottom(0.5f)
                        .BorderColor(Colors.Grey.Lighten2);
                });

                page.Footer().AlignCenter().Text($"Laboratorio Clinico, Sangre de Cristo, Generado el {DateTime.Now:dd/MM/yyyy HH:mm}");
            });
        });

        var pdfStream = new MemoryStream();
        document.GeneratePdf(pdfStream);
        pdfStream.Position = 0;

        return File(pdfStream, "application/pdf", "TopExamenes.pdf");
    }
    catch (Exception ex)
    {
        return StatusCode(500, $"Error al generar el PDF: {ex.Message}");
    }
}

    }
}
