using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using APILABORATORIO.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

[ApiController]
[Route("api/[controller]")]
public class ReportesMedicosController : ControllerBase
{
    private readonly LaboratorioClinicoContext _context;

    public ReportesMedicosController(LaboratorioClinicoContext context)
    {
        _context = context;
        QuestPDF.Settings.License = LicenseType.Community;
    }

    // Endpoint para obtener datos JSON
    [HttpGet("top-medicos")]
    public async Task<ActionResult<IEnumerable<TopMedicoDto>>> GetTopMedicos(
        [FromQuery] DateTime? fechaInicio = null,
        [FromQuery] DateTime? fechaFin = null,
        [FromQuery] int? top = 10,
        [FromQuery] int? idTipoExamen = null)
    {
        fechaInicio ??= DateTime.Now.AddMonths(-1);
        fechaFin ??= DateTime.Now;

        var query = _context.Ordens
            .Include(o => o.IdmedicoNavigation)
            .Include(o => o.DetalleOrdens)
            .Where(o => o.FechaOrden >= fechaInicio && o.FechaOrden <= fechaFin);

        // Filtrar por tipo de examen si se especifica
        if (idTipoExamen.HasValue)
        {
            query = query.Where(o => o.DetalleOrdens.Any(d => d.IdtipoExamen == idTipoExamen));
        }

        var resultados = await query
            .GroupBy(o => o.IdmedicoNavigation)
            .Select(g => new TopMedicoDto
            {
                Medico = g.Key,
                TotalExamenes = g.Sum(o => o.DetalleOrdens.Count),
                TotalOrdenes = g.Count(),
                PorcentajeTotal = (decimal)g.Sum(o => o.DetalleOrdens.Count) * 100 / 
                                _context.DetalleOrdens.Count(d => 
                                    d.IdordenNavigation.FechaOrden >= fechaInicio && 
                                    d.IdordenNavigation.FechaOrden <= fechaFin)
            })
            .OrderByDescending(x => x.TotalExamenes)
            .Take(top ?? 10)
            .ToListAsync();

        return Ok(resultados);
    }

    // Endpoint para generar PDF
    [HttpGet("top-medicos-pdf")]
    public async Task<IActionResult> GetTopMedicosPdf(
        [FromQuery] DateTime? fechaInicio = null,
        [FromQuery] DateTime? fechaFin = null,
        [FromQuery] int? top = 10,
        [FromQuery] int? idTipoExamen = null)
    {
        fechaInicio ??= DateTime.Now.AddMonths(-1);
        fechaFin ??= DateTime.Now;

        var data = await GetTopMedicosData(fechaInicio.Value, fechaFin.Value, top, idTipoExamen);

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(11));
page.Header().Row(row =>
{
    // Ruta al logo
               var logoPath = Path.Combine(Directory.GetCurrentDirectory(), "img", "logo.jpeg");
            var logoBytes = System.IO.File.ReadAllBytes(logoPath);

    // Columna con el logo
    row.ConstantItem(80).Height(80).AlignLeft().AlignMiddle().Image(logoBytes);

    // Columna con el título
    row.RelativeItem().AlignCenter().AlignMiddle().Column(col =>
    {
        col.Item().Text("LABORATORIO CLÍNICO")
            .Bold().FontSize(16)
            .FontColor(Colors.Blue.Darken3);
    });
});

                page.Content()
    .PaddingVertical(1, Unit.Centimetre)
    .Column(column =>
    {
        // Título
        column.Item()
            .AlignCenter()
            .Text($"TOP {data.Count} MÉDICOS CON MÁS EXÁMENES REALIZADOS")
            .Bold().FontSize(14);

        // Fechas - Modificado para usar padding correctamente
        column.Item().Container().PaddingBottom(15).AlignCenter().Text($"{fechaInicio:dd/MM/yyyy} - {fechaFin:dd/MM/yyyy}").FontSize(11);

        if (idTipoExamen.HasValue)
        {
            var tipoExamen = _context.TipoExamen
                .FirstOrDefault(t => t.IdtipoExamen == idTipoExamen);
            column.Item().Container().PaddingBottom(10).AlignCenter().Text($"Tipo de examen: {tipoExamen?.NombreExamen ?? "Desconocido"}").FontSize(11);
        }

column.Item().Table(table =>
{
    table.ColumnsDefinition(columns =>
    {
        columns.RelativeColumn(1); // Posición
        columns.RelativeColumn(3); // Médico
        columns.RelativeColumn(1.5f); // Especialidad
        columns.RelativeColumn(1); // Exámenes
        columns.RelativeColumn(1); // Órdenes
        columns.RelativeColumn(1); // Porcentaje
    });

    // Cabecera
    table.Header(header =>
    {
        header.Cell().Text("#").Bold();
        header.Cell().Text("Médico").Bold();
        header.Cell().Text("Especialidad").Bold();
        header.Cell().Container().AlignRight().Text("Exámenes").Bold(); // Corregido
        header.Cell().Container().AlignRight().Text("Órdenes").Bold(); // Corregido
        header.Cell().Container().AlignRight().Text("% Total").Bold(); // Corregido
    });

    // Datos
    for (int i = 0; i < data.Count; i++)
    {
        var item = data[i];
        table.Cell().Text($"{i + 1}");
        table.Cell().Text($"{item.Medico.Nombre}");
        table.Cell().Text($"{item.Medico.Especialidad ?? "N/A"}");
        table.Cell().Container().AlignRight().Text($"{item.TotalExamenes}"); // Corregido
        table.Cell().Container().AlignRight().Text($"{item.TotalOrdenes}"); // Corregido
        table.Cell().Container().AlignRight().Text($"{item.PorcentajeTotal:0.00}%"); // Corregido
    }
});

                        // Totales
                        column.Item()
                            .PaddingTop(15)
                            .Row(row =>
                            {
                                row.RelativeItem()
                                    .Text($"Total general de exámenes: {data.Sum(x => x.TotalExamenes)}")
                                    .FontSize(11);

                                row.RelativeItem()
                                    .AlignRight()
                                    .Text($"Total general de órdenes: {data.Sum(x => x.TotalOrdenes)}")
                                    .FontSize(11);
                            });
                    });

                page.Footer()
                    .AlignCenter()
                    .Text(x =>
                    {
                        x.Span("Laboratorio Clinico Sangre de Cristo, Generado el ");
                        x.Span($"{DateTime.Now:dd/MM/yyyy HH:mm}").Bold();
                    });
            });
        });

        var stream = new MemoryStream();
        document.GeneratePdf(stream);
        stream.Position = 0;

        return File(stream, "application/pdf", 
            $"top-medicos-{fechaInicio:yyyyMMdd}-{fechaFin:yyyyMMdd}.pdf");
    }

    private async Task<List<TopMedicoDto>> GetTopMedicosData(
        DateTime fechaInicio, DateTime fechaFin, int? top, int? idTipoExamen)
    {
        var query = _context.Ordens
            .Include(o => o.IdmedicoNavigation)
            .Include(o => o.DetalleOrdens)
            .Where(o => o.FechaOrden >= fechaInicio && o.FechaOrden <= fechaFin);

        if (idTipoExamen.HasValue)
        {
            query = query.Where(o => o.DetalleOrdens.Any(d => d.IdtipoExamen == idTipoExamen));
        }

        var totalExamenesPeriodo = await _context.DetalleOrdens
            .CountAsync(d => d.IdordenNavigation.FechaOrden >= fechaInicio && 
                           d.IdordenNavigation.FechaOrden <= fechaFin &&
                           (!idTipoExamen.HasValue || d.IdtipoExamen == idTipoExamen));

        var resultados = await query
            .GroupBy(o => o.IdmedicoNavigation)
            .Select(g => new TopMedicoDto
            {
                Medico = g.Key,
                TotalExamenes = g.Sum(o => o.DetalleOrdens.Count),
                TotalOrdenes = g.Count(),
                PorcentajeTotal = totalExamenesPeriodo > 0 ? 
                    (decimal)g.Sum(o => o.DetalleOrdens.Count) * 100 / totalExamenesPeriodo : 0
            })
            .OrderByDescending(x => x.TotalExamenes)
            .Take(top ?? 10)
            .ToListAsync();

        return resultados;
    }
}

public class TopMedicoDto
{
    public Medico Medico { get; set; }
    public int TotalExamenes { get; set; }
    public int TotalOrdenes { get; set; }
    public decimal PorcentajeTotal { get; set; }
}