using APILABORATORIO.Models;
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
    public class ReportePacienteController : ControllerBase
    {
        private readonly LaboratorioClinicoContext _context;

        public ReportePacienteController(LaboratorioClinicoContext context)
        {
            _context = context;
        }

        [HttpGet("PacientesRegistrados")]
public async Task<IActionResult> PacientesRegistrados(
    DateOnly? fechaInicioNacimiento = null,
    DateOnly? fechaFinNacimiento = null,
    string orden = "mayor")
{
    var query = _context.Clientes.AsQueryable();

    if (fechaInicioNacimiento.HasValue)
    {
        query = query.Where(c => c.FechaNacimiento >= fechaInicioNacimiento);
    }

    if (fechaFinNacimiento.HasValue)
    {
        query = query.Where(c => c.FechaNacimiento <= fechaFinNacimiento);
    }

    if (orden.ToLower() == "mayor")
    {
        query = query.OrderBy(c => c.FechaNacimiento);
    }
    else if (orden.ToLower() == "menor")
    {
        query = query.OrderByDescending(c => c.FechaNacimiento);
    }

    var pacientes = await query.ToListAsync();

    if (pacientes == null || pacientes.Count == 0)
        return NotFound("No se encontraron pacientes registrados en ese rango.");

            // Cargar el logo
            var exePath = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
            var imagePath = Path.Combine(exePath, "img", "logo.jpeg");
            byte[] imageBytes = System.IO.File.ReadAllBytes(imagePath);

            var document = Document.Create(container =>
    {
        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(30);
            page.DefaultTextStyle(x => x.FontSize(12));

            page.Header().Column(col =>
            {
                col.Item().Row(row =>
                {
                    row.ConstantItem(80).Image(imageBytes);
                    row.RelativeItem().AlignCenter().Text(text =>
                    {
                        text.Span("Laboratorio Clínico Central").FontSize(18).Bold();
                        text.Line("Reporte de Pacientes Registrados").FontSize(14);
                        if (fechaInicioNacimiento.HasValue || fechaFinNacimiento.HasValue)
                        {
                            string desde = fechaInicioNacimiento?.ToString("dd/MM/yyyy") ?? "...";
                            string hasta = fechaFinNacimiento?.ToString("dd/MM/yyyy") ?? "...";
                            text.Line($"Nacimiento entre {desde} y {hasta}").FontSize(12);
                        }
                        else
                        {
                            text.Line("Todos los pacientes registrados").FontSize(12);
                        }
                    });
                });
                col.Item().PaddingVertical(10).LineHorizontal(1);
            });

            page.Content().PaddingVertical(10).Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.RelativeColumn(); // Nombre
                    columns.ConstantColumn(120); // Fecha
                    columns.ConstantColumn(80);  // Género
                    columns.ConstantColumn(100); // Teléfono
                });

                table.Header(header =>
                {
                    header.Cell().Element(CellStyleHeader).Text("Nombre");
                    header.Cell().Element(CellStyleHeader).Text("Fecha Nacimiento");
                    header.Cell().Element(CellStyleHeader).Text("Género");
                    header.Cell().Element(CellStyleHeader).Text("Teléfono");
                });

                foreach (var paciente in pacientes)
                {
                    table.Cell().Element(CellStyleBody).Text(paciente.Nombre);
                    table.Cell().Element(CellStyleBody).Text(paciente.FechaNacimiento?.ToString("yyyy-MM-dd") ?? "N/A");
                    table.Cell().Element(CellStyleBody).Text(paciente.Genero ?? "N/A");
                    table.Cell().Element(CellStyleBody).Text(paciente.Telefono ?? "N/A");
                }

                static IContainer CellStyleHeader(IContainer container) => container
                    .Background(Colors.Grey.Lighten2)
                    .Padding(5)
                    .BorderBottom(1)
                    .DefaultTextStyle(x => x.SemiBold());

                static IContainer CellStyleBody(IContainer container) => container
                    .PaddingVertical(5)
                    .PaddingHorizontal(2)
                    .BorderBottom(0.5f)
                    .BorderColor(Colors.Grey.Lighten2);
            });

            page.Footer().AlignCenter().Text($"Laboratorio Clinico Sangre de Cristo, Generado el {DateTime.Now:dd/MM/yyyy HH:mm}");
        });
    });

    var pdfBytes = document.GeneratePdf();
    return File(pdfBytes, "application/pdf", "PacientesRegistrados.pdf");
}
    }
}
