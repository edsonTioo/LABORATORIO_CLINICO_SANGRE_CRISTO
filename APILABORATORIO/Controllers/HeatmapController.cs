using APILABORATORIO.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace LaboratorioClinico.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class HeatmapController : ControllerBase
    {
        private readonly LaboratorioClinicoContext _context;

        public HeatmapController(LaboratorioClinicoContext context)
        {
            _context = context;
        }

        // GET: api/Heatmap/OrdenesPorFecha
        [HttpGet("OrdenesPorFecha")]
        public async Task<ActionResult<IEnumerable<HeatmapData>>> GetOrdenesPorFecha(
     [FromQuery] DateTime? endDate = null)
        {
            // Establecer la fecha final como la fecha actual si no se proporciona
            endDate ??= DateTime.Today;

            // Obtener la fecha más temprana desde la base de datos (FechaOrden más antigua)
            var startDate = await _context.Ordens
                                          .MinAsync(o => o.FechaOrden) ?? DateTime.Today.AddMonths(-6); // Establecer una fecha predeterminada si no hay datos

            // Filtrar las órdenes entre la fecha más temprana y la fecha actual
            var query = _context.Ordens
                                .Where(o => o.FechaOrden >= startDate && o.FechaOrden <= endDate)
                                .GroupBy(o => o.FechaOrden.Value.Date)
                                .Select(g => new HeatmapData
                                {
                                    Date = g.Key,
                                    Count = g.Count()
                                });

            return await query.ToListAsync();
        }


        [HttpGet("ExamenesPorFecha")]
        public async Task<ActionResult<IEnumerable<HeatmapData>>> GetExamenesPorFecha(
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            // Establecer fechas por defecto si no se proporcionan
            startDate ??= DateTime.Today.AddMonths(-6);
            endDate ??= DateTime.Today;

            // Truncar las fechas a solo fecha (sin hora) para la comparación
            var startDateOnly = startDate.Value.Date;
            var endDateOnly = endDate.Value.Date;

            var query = _context.DetalleOrdens
                .Join(_context.Ordens,
                    detalle => detalle.Idorden,
                    orden => orden.Idorden,
                    (detalle, orden) => new { detalle, orden })
                .Where(x => x.orden.FechaOrden.HasValue && x.orden.FechaOrden.Value.Date >= startDateOnly && x.orden.FechaOrden.Value.Date <= endDateOnly)
                .GroupBy(x => x.orden.FechaOrden.Value.Date)
                .Select(g => new HeatmapData
                {
                    Date = g.Key,
                    Count = g.Count()
                });

            return await query.ToListAsync();
        }


        public class HeatmapData
        {
            public DateTime Date { get; set; }
            public int Count { get; set; }
        }
    }
}