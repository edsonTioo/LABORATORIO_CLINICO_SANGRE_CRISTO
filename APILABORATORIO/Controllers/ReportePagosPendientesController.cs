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
    public class ReportePagosPendientesController : ControllerBase
    {
        private readonly LaboratorioClinicoContext _context;

        public ReportePagosPendientesController(LaboratorioClinicoContext context)
        {
            _context = context;
        }

        [HttpGet("PagosPendientes")]
        public async Task<IActionResult> PagosPendientes(DateTime? fechaInicio, DateTime? fechaFin)
        {
            var detallesPendientesQuery = _context.DetalleOrdens
                .Include(d => d.IdordenNavigation)
                    .ThenInclude(o => o.IdclienteNavigation)
                .Include(d => d.IdordenNavigation)
                    .ThenInclude(o => o.IdmedicoNavigation)
                .Include(d => d.IdtipoExamenNavigation)
                .Where(d => !_context.DetalleFacturas
                    .Any(df => df.IddetalleOrden == d.IddetalleOrden));

            if (fechaInicio.HasValue && fechaFin.HasValue)
            {
                detallesPendientesQuery = detallesPendientesQuery
                    .Where(d => d.IdordenNavigation.FechaOrden >= fechaInicio && d.IdordenNavigation.FechaOrden <= fechaFin);
            }

            var detallesPendientes = await detallesPendientesQuery.ToListAsync();

            if (!detallesPendientes.Any())
                return NotFound("No hay pagos pendientes en el rango de fechas seleccionado.");

            // 🖼 Leer el logo
            var logoPath = Path.Combine(Directory.GetCurrentDirectory(), "img", "logo.jpeg");
            if (!System.IO.File.Exists(logoPath))
            {
                return NotFound("No se encontró el logo en la ruta esperada.");
            }
            var logoBytes = System.IO.File.ReadAllBytes(logoPath);

            var document = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(30);
                    page.DefaultTextStyle(x => x.FontSize(12).FontFamily("Arial"));

                    // 🧾 Encabezado con logo
                    page.Header().Row(row =>
                    {
                        row.ConstantItem(80).Image(logoBytes); // Mostrar logo
                        row.RelativeItem().Column(col =>
                        {
                            col.Item().Text("Reporte de Pagos Pendientes")
                                .FontSize(20)
                                .Bold()
                                .FontColor(Colors.Blue.Medium);
                            if (fechaInicio.HasValue && fechaFin.HasValue)
                            {
                                col.Item().Text($"Rango de Fechas: {fechaInicio.Value:dd/MM/yyyy} - {fechaFin.Value:dd/MM/yyyy}")
                                    .FontSize(12)
                                    .Italic()
                                    .FontColor(Colors.Grey.Darken1);
                            }
                        });
                    });

                    // 📋 Contenido principal
                    page.Content().Column(col =>
                    {
                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(columns =>
                            {
                                columns.RelativeColumn(); // Paciente
                                columns.RelativeColumn(); // Fecha de Orden
                                columns.RelativeColumn(); // Médico
                                columns.RelativeColumn(); // Examen
                            });

                            table.Header(header =>
                            {
                                header.Cell().Background("#EEE").Padding(5).Text("Paciente").Bold();
                                header.Cell().Background("#EEE").Padding(5).Text("Fecha de Orden").Bold();
                                header.Cell().Background("#EEE").Padding(5).Text("Médico").Bold();
                                header.Cell().Background("#EEE").Padding(5).Text("Examen").Bold();
                            });

                            foreach (var detalle in detallesPendientes)
                            {
                                table.Cell().Padding(5).Text(detalle.IdordenNavigation.IdclienteNavigation.Nombre);
                                table.Cell().Padding(5).Text(detalle.IdordenNavigation.FechaOrden.Value.ToString("dd/MM/yyyy"));
                                table.Cell().Padding(5).Text(detalle.IdordenNavigation.IdmedicoNavigation.Nombre);
                                table.Cell().Padding(5).Text(detalle.IdtipoExamenNavigation.NombreExamen);
                            }
                        });
                    });

                    // 🕒 Pie de página
                    page.Footer()
                        .AlignRight()
                        .Text($"Laboratorio Clinico Sangre de Cristo, Generado: {DateTime.Now:dd/MM/yyyy HH:mm}")
                        .FontSize(10)
                        .Italic();
                });
            });

            var pdfBytes = document.GeneratePdf();
            return File(pdfBytes, "application/pdf", "ReportePagosPendientes.pdf");
        }
    }
}
