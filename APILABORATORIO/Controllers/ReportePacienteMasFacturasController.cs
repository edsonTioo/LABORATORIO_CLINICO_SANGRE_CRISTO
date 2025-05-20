using APILABORATORIO.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace LaboratorioClinico.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReportePacienteMasFacturasController : ControllerBase
    {
        private readonly LaboratorioClinicoContext _context;

        public ReportePacienteMasFacturasController(LaboratorioClinicoContext context)
        {
            _context = context;
        }

        [HttpGet("PacienteConMasExamenes")]
        public async Task<IActionResult> PacienteConMasExamenes([FromQuery] DateTime fechaInicio, [FromQuery] DateTime fechaFin)
        {
            var pacienteConMasFacturas = await _context.Facturas
                .Where(f => f.FechaFactura >= fechaInicio && f.FechaFactura <= fechaFin)
                .GroupBy(f => f.Idcliente)
                .Select(g => new
                {
                    IdCliente = g.Key,
                    TotalFacturas = g.Count()
                })
                .OrderByDescending(g => g.TotalFacturas)
                .FirstOrDefaultAsync();

            if (pacienteConMasFacturas == null)
                return NotFound("No hay pacientes con facturas registradas en el rango de fechas.");

            var paciente = await _context.Clientes
                .FirstOrDefaultAsync(c => c.Idcliente == pacienteConMasFacturas.IdCliente);

            if (paciente == null)
                return NotFound("El paciente no fue encontrado.");

            var examenesRealizados = await _context.Facturas
                .Where(f => f.Idcliente == paciente.Idcliente && f.FechaFactura >= fechaInicio && f.FechaFactura <= fechaFin)
                .SelectMany(f => f.DetalleFacturas.Select(df => new
                {
                    f.Idfactura,
                    f.FechaFactura,
                    NombrePaciente = f.IdclienteNavigation.Nombre,
                    NombreExamen = df.IddetalleOrdenNavigation.IdtipoExamenNavigation.NombreExamen
                }))
                .ToListAsync();

            // Cargar el logo
            var logoPath = Path.Combine(Directory.GetCurrentDirectory(), "img", "logo.jpeg");
            var logoBytes = System.IO.File.Exists(logoPath) ? System.IO.File.ReadAllBytes(logoPath) : null;

            var document = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(30);
                    page.DefaultTextStyle(x => x.FontSize(12).FontFamily("Arial"));

                    // ENCABEZADO CON LOGO
                    page.Header().Row(row =>
                    {
                        if (logoBytes != null)
                        {
                            row.ConstantItem(80).Image(logoBytes);
                        }
                        row.RelativeItem().Column(header =>
                        {
                            header.Item().Text("Laboratorio Clínico Central")
                                .FontSize(18).Bold().FontColor(Colors.Blue.Medium);

                            header.Item().Text("📋 Reporte: Paciente con más exámenes")
                                .FontSize(14).Italic().FontColor(Colors.Grey.Darken2);

                            header.Item().PaddingVertical(10).LineHorizontal(1).LineColor(Colors.Grey.Lighten1);
                        });
                    });

                    // CONTENIDO
                    page.Content().Column(content =>
                    {
                        content.Spacing(10);

                        content.Item().Text($"📅 Rango de Fechas: {fechaInicio:dd/MM/yyyy} - {fechaFin:dd/MM/yyyy}").SemiBold();
                        content.Item().Text($"🧑 Paciente: {paciente.Nombre}").Bold().FontSize(13);
                        content.Item().Text($"🧾 Número de Facturas: {pacienteConMasFacturas.TotalFacturas}");

                        content.Item().PaddingTop(10).Text("📄 Detalle de Exámenes Realizados:")
                            .FontSize(13).Bold().Underline();

                        content.Item().Table(table =>
                        {
                            table.ColumnsDefinition(columns =>
                            {
                                columns.RelativeColumn(); // Fecha
                                columns.ConstantColumn(100); // Nº Factura
                                columns.RelativeColumn(); // Examen
                            });

                            table.Header(header =>
                            {
                                header.Cell().Background("#EEE").Padding(5).Text("Fecha de Factura").Bold();
                                header.Cell().Background("#EEE").Padding(5).AlignCenter().Text("N° Factura").Bold();
                                header.Cell().Background("#EEE").Padding(5).Text("Examen").Bold();
                            });

                            foreach (var ex in examenesRealizados)
                            {
                                table.Cell().Padding(5).Text(ex.FechaFactura?.ToString("dd/MM/yyyy"));
                                table.Cell().Padding(5).AlignCenter().Text(ex.Idfactura.ToString());
                                table.Cell().Padding(5).Text(ex.NombreExamen);
                            }
                        });
                    });

                    // PIE DE PÁGINA
                    page.Footer().AlignCenter().Text(text =>
                    {
                        text.Span("Laboratorio Clinico Sangre de Cristo, Generado el ").FontSize(10);
                        text.Span($"{DateTime.Now:dd/MM/yyyy HH:mm}").SemiBold().FontSize(10);
                        text.Span(" - Página ").FontSize(10);
                        text.CurrentPageNumber().FontSize(10);
                    });
                });
            });

            var pdfBytes = document.GeneratePdf();
            return File(pdfBytes, "application/pdf", "PacienteConMasExamenes.pdf");
        }
    }
}
