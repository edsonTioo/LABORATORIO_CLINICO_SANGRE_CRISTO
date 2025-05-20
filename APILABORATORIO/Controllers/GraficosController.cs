using APILABORATORIO.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.Security.Cryptography;
using System.Globalization;

namespace LaboratorioClinico.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class GraficosController : ControllerBase
    {
        private readonly LaboratorioClinicoContext _context;
        public GraficosController(LaboratorioClinicoContext context)
        {
            _context = context;
        }

        // GET: api/Graficos/OrdenesPendientes
        [HttpGet("OrdenesPendientes")]
        public async Task<ActionResult<int>> GetOrdenesPendientesCount()
        {
            try
            {
                // Contar directamente las órdenes pendientes sin cargar datos relacionados
                var count = await _context.Ordens
                    .CountAsync(o => o.Estado == "Pendiente");

                return Ok(count);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }
        [HttpGet("TotalClientes")]
        public async Task<ActionResult<int>> TotalClientes()
        {
            try
            {
                var count = await _context.Clientes.CountAsync(); // Replace 0 with the appropriate integer value
                return Ok(count);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor:{ex.Message}");
            }
        }
        [HttpGet("TotalMedicos")]
        public async Task<ActionResult<int>> TotalMedicos()
        {
            try
            {
                var count = await _context.Medicos.CountAsync();
                return Ok(count);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor:{ex.Message}");
            }
        }

        [HttpGet("Anual/{year}")]
        public async Task<ActionResult<Dictionary<string, decimal>>> GetGananciasAnuales(int year)
        {
            var ganancias = await _context.Facturas
                .Where(f => f.FechaFactura.HasValue && f.FechaFactura.Value.Year == year)
                .GroupBy(f => new { Mes = f.FechaFactura.HasValue ? f.FechaFactura.Value.Month : 0 })
                .Select(g => new
                {
                    Mes = g.Key.Mes,
                    Total = g.Sum(f => f.Total)
                })
                .OrderBy(g => g.Mes)
                .ToDictionaryAsync(
                    g => CultureInfo.CurrentCulture.DateTimeFormat.GetMonthName(g.Mes), // Ej: "Enero"
                    g => g.Total
                );

            return Ok(ganancias);
        }

        public class MedicoExamenesDTO
        {
            public string NombreMedico { get; set; }
            public int CantidadExamenes { get; set; }
        }
        [HttpGet("MedicosConMasExamenes")]
        public async Task<ActionResult<IEnumerable<MedicoExamenesDTO>>> GetMedicosConMasExamenes()
        {
            try
            {
                var medicosConExamenes = await _context.Medicos
                    .Select(m => new MedicoExamenesDTO
                    {
                        NombreMedico = m.Nombre,
                        CantidadExamenes = m.Ordens
                            .SelectMany(o => o.DetalleOrdens)
                            .Count()
                    })
                    .OrderByDescending(x => x.CantidadExamenes)
                    .Take(5) // Top 5 médicos
                    .ToListAsync();

                return Ok(medicosConExamenes);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }



        [HttpGet("GananciasMensuales")]
        public async Task<ActionResult<Dictionary<string, decimal>>> GetGananciasMensuales()
        {
            var currentYear = DateTime.Now.Year;
            var ganancias = await _context.Facturas
                .Where(f => f.FechaFactura.HasValue && f.FechaFactura.Value.Year == currentYear)
                .GroupBy(f => new { Mes = f.FechaFactura.Value.Month })
                .Select(g => new
                {
                    Mes = g.Key.Mes,
                    Total = g.Sum(f => f.Total)
                })
                .OrderBy(g => g.Mes)
                .ToDictionaryAsync(
                    g => CultureInfo.CurrentCulture.DateTimeFormat.GetAbbreviatedMonthName(g.Mes),
                    g => g.Total
                );

            // Ensure all months are present (even with 0 value)
            var completeData = Enumerable.Range(1, 12)
                .ToDictionary(
                    m => CultureInfo.CurrentCulture.DateTimeFormat.GetAbbreviatedMonthName(m),
                    m => ganancias.ContainsKey(CultureInfo.CurrentCulture.DateTimeFormat.GetAbbreviatedMonthName(m))
                        ? ganancias[CultureInfo.CurrentCulture.DateTimeFormat.GetAbbreviatedMonthName(m)]
                        : 0m
                );

            return Ok(completeData);
        }
        [HttpGet("ExamenesMasSolicitados")]
        public async Task<ActionResult<IEnumerable<object>>> GetExamenesMasSolicitados()
        {
            var examenes = await _context.TipoExamen
                .Select(e => new
                {
                    NombreExamen = e.NombreExamen,
                    Cantidad = e.DetalleOrdens.Count()
                })
                .OrderByDescending(e => e.Cantidad)
                .Take(5)
                .ToListAsync();

            return Ok(examenes);
        }
        [HttpGet("OrdenesPorEstado")]
        public async Task<ActionResult<Dictionary<string, int>>> GetOrdenesPorEstado()
        {
            var estados = await _context.Ordens
                .GroupBy(o => o.Estado)
                .Select(g => new
                {
                    Estado = g.Key,
                    Cantidad = g.Count()
                })
                .ToDictionaryAsync(g => g.Estado, g => g.Cantidad);

            return Ok(estados);
        }
        [HttpGet("DemografiaClientes")]
        public async Task<ActionResult<Dictionary<string, int>>> GetDemografiaClientes()

        {
            var demografia = await _context.Clientes
                .GroupBy(c => c.Genero)
                .Select(g => new
                {
                    Genero = g.Key == "M" ? "Masculino" : "Femenino",
                    Cantidad = g.Count()
                })
                .ToDictionaryAsync(g => g.Genero, g => g.Cantidad);

            return Ok(demografia);
        }

        [HttpGet("PacientesFrecuentes")]
        public async Task<ActionResult<IEnumerable<object>>> GetPacientesFrecuentes()
        {
            try
            {
                var pacientes = await _context.Ordens
                    .GroupBy(o => new { o.Idcliente, o.IdclienteNavigation.Nombre })
                    .Select(g => new
                    {
                        ClienteId = g.Key.Idcliente,
                        NombreCliente = g.Key.Nombre,
                        OrdenesCount = g.Count(),
                        UltimaVisita = g.Max(o => o.FechaOrden)
                    })
                    .OrderByDescending(x => x.OrdenesCount)
                    .Take(10)
                    .ToListAsync();

                return Ok(pacientes);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }

       
        [HttpGet("IngresosPorExamen")]
        public async Task<ActionResult<IEnumerable<object>>> GetIngresosPorTipoExamen()
        {
            try
            {
                var ingresos = await _context.TipoExamen
                    .Select(e => new
                    {
                        Examen = e.NombreExamen,
                        Cantidad = e.DetalleOrdens.Count(),
                        TotalIngresos = e.DetalleOrdens.Sum(d => d.IdtipoExamenNavigation.Precio)
                    })
                    .OrderByDescending(x => x.TotalIngresos)
                    .Take(10)
                    .ToListAsync();

                return Ok(ingresos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }
        [HttpGet("ExamenesRecientes")]
        public async Task<ActionResult<IEnumerable<object>>> GetExamenesRecientes()
        {
            try
            {
                var fechaFin = DateTime.Now;
                var fechaInicio = fechaFin.AddDays(-30); // Últimos 30 días por defecto

                var examenes = await _context.DetalleOrdens
                    .Where(d => d.IdordenNavigation.FechaOrden >= fechaInicio && d.IdordenNavigation.FechaOrden <= fechaFin)
                    .GroupBy(d => d.IdtipoExamenNavigation.NombreExamen)
                    .Select(g => new
                    {
                        Examen = g.Key,
                        Cantidad = g.Count(),
                        TotalIngresos = g.Sum(d => d.IdtipoExamenNavigation.Precio),
                        Porcentaje = (double)g.Count() * 100 / _context.DetalleOrdens
                            .Count(d => d.IdordenNavigation.FechaOrden >= fechaInicio && d.IdordenNavigation.FechaOrden <= fechaFin)
                    })
                    .OrderByDescending(x => x.Cantidad)
                    .Take(10) // Top 10 exámenes
                    .ToListAsync();

                return Ok(new
                {
                    Periodo = $"Últimos 30 días ({fechaInicio:dd/MM/yyyy} - {fechaFin:dd/MM/yyyy})",
                    TotalExamenes = examenes.Sum(x => x.Cantidad),
                    Detalles = examenes
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }

        [HttpGet("TendenciaExamenActual")]
public async Task<ActionResult<Dictionary<string, int>>> GetTendenciaExamenActual()
{
    try
    {
        // Obtener el examen más solicitado en el último mes
        var examenMasSolicitado = await _context.DetalleOrdens
            .Where(d => d.IdordenNavigation.FechaOrden >= DateTime.Now.AddMonths(-1))
            .GroupBy(d => d.IdtipoExamenNavigation.IdtipoExamen)
            .Select(g => new
            {
                ExamenId = g.Key,
                Cantidad = g.Count()
            })
            .OrderByDescending(x => x.Cantidad)
            .FirstOrDefaultAsync();

        if (examenMasSolicitado == null)
            return Ok(new Dictionary<string, int>());

        var currentYear = DateTime.Now.Year;
        var tendencias = await _context.DetalleOrdens
            .Where(d => d.IdtipoExamenNavigation.IdtipoExamen == examenMasSolicitado.ExamenId && 
                   d.IdordenNavigation.FechaOrden.HasValue && d.IdordenNavigation.FechaOrden.Value.Year == currentYear)
            .GroupBy(d => d.IdordenNavigation.FechaOrden.HasValue ? d.IdordenNavigation.FechaOrden.Value.Month : 0)
            .Select(g => new
            {
                Mes = g.Key,
                Cantidad = g.Count()
            })
            .OrderBy(g => g.Mes)
            .ToDictionaryAsync(
                g => CultureInfo.CurrentCulture.DateTimeFormat.GetAbbreviatedMonthName(g.Mes),
                g => g.Cantidad
            );

        // Asegurar que todos los meses estén presentes
        var completeData = Enumerable.Range(1, 12)
            .ToDictionary(
                m => CultureInfo.CurrentCulture.DateTimeFormat.GetAbbreviatedMonthName(m),
                m => tendencias.ContainsKey(CultureInfo.CurrentCulture.DateTimeFormat.GetAbbreviatedMonthName(m))
                    ? tendencias[CultureInfo.CurrentCulture.DateTimeFormat.GetAbbreviatedMonthName(m)]
                    : 0
            );

        // Obtener nombre del examen
        var nombreExamen = await _context.TipoExamen
            .Where(e => e.IdtipoExamen == examenMasSolicitado.ExamenId)
            .Select(e => e.NombreExamen)
            .FirstOrDefaultAsync();

        return Ok(new {
            Examen = nombreExamen,
            TotalAnual = completeData.Sum(x => x.Value),
            TendenciaMensual = completeData
        });
    }
    catch (Exception ex)
    {
        return StatusCode(500, $"Error interno del servidor: {ex.Message}");
    }
}

    }
    //reporte por ordenes pendientes, total clientes, total medicos, anual, medicoscon mas examenes, ganancias mensuales, ordenesporestado, demografiaclientes
}