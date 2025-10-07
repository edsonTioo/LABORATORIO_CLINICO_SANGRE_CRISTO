using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using APILABORATORIO.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace APILABORATORIO.Controllers
{
    
    [Route("api/[controller]")]
    [ApiController]
    public class UpdateResultController : ControllerBase
    {
        private readonly LaboratorioClinicoContext _context;

        public UpdateResultController(LaboratorioClinicoContext context)
        {
            _context = context;
        }

        [HttpGet("conResultados")]
        public async Task<ActionResult<IEnumerable<ClienteConResultadosDTO>>> GetClientesConResultados([FromQuery] int? idCliente = null)
        {
            var query = _context.Clientes
                .Include(c => c.Ordens)
                    .ThenInclude(o => o.DetalleOrdens)
                        .ThenInclude(d => d.IdtipoExamenNavigation)
                .Include(c => c.Ordens)
                    .ThenInclude(o => o.DetalleOrdens)
                        .ThenInclude(d => d.ResultadoExamen)
                            .ThenInclude(r => r.IdparametroNavigation)
                .Where(c => idCliente == null || c.Idcliente == idCliente)
                .Select(c => new ClienteConResultadosDTO
                {
                    IdCliente = c.Idcliente,
                    Nombre = c.Nombre,
                    Ordenes = c.Ordens
                        .Where(o => o.DetalleOrdens.Any(d => d.ResultadoExamen.Any()))
                        .Select(o => new OrdenConResultadosDTO
                        {
                            IdOrden = o.Idorden,
                            FechaOrden = o.FechaOrden,
                            Estado = o.Estado,
                            Examenes = o.DetalleOrdens
                                .Where(d => d.ResultadoExamen.Any())
                                .Select(d => new ExamenConResultadosDTO
                                {
                                    IdExamen = d.IdtipoExamen ?? 0, // Asumiendo que IdtipoExamen es int
                                    NombreExamen = d.IdtipoExamenNavigation != null ?
                                        d.IdtipoExamenNavigation.NombreExamen : string.Empty,
                                    Resultados = d.ResultadoExamen
                                        .Select(r => new ResultadoDTO
                                        {
                                            IdResultado = r.Idresultado,
                                            NombreParametro = r.NombreParametro,
                                            Resultado = r.Resultado,
                                            FechaResultado = r.FechaResultado,
                                            OpcionesFijas = r.IdparametroNavigation != null ?
                                                r.IdparametroNavigation.OpcionesFijas : null
                                        }).ToList()
                                }).ToList()
                        }).ToList()
                });

            return await query.ToListAsync();
        }

        private bool ResultadoExists(int id)
        {
            return _context.ResultadoExamen.Any(e => e.Idresultado == id);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutResultado(int id, ResultadoUpdateDTO resultadoUpdate)
        {
            var resultado = await _context.ResultadoExamen.FindAsync(id);
            if (resultado == null)
            {
                return NotFound();
            }

            resultado.Resultado = resultadoUpdate.Resultado;
            resultado.FechaResultado = DateTime.Now;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ResultadoExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }
    }

    public class ClienteConResultadosDTO
    {
        public int IdCliente { get; set; }
        public string Nombre { get; set; }
        public List<OrdenConResultadosDTO> Ordenes { get; set; }
    }

    public class OrdenConResultadosDTO
    {
        public int IdOrden { get; set; }
        public DateTime? FechaOrden { get; set; }
        public string Estado { get; set; }
        public List<ExamenConResultadosDTO> Examenes { get; set; }
    }

    public class ExamenConResultadosDTO
    {
        public int IdExamen { get; set; }
        public string NombreExamen { get; set; }
        public List<ResultadoDTO> Resultados { get; set; }
    }

    public class ResultadoDTO
    {
        public int IdResultado { get; set; }
        public string NombreParametro { get; set; }
        public string Resultado { get; set; }
        public DateTime? FechaResultado { get; set; }
        public string OpcionesFijas { get; set; }
    }

    public class ResultadoUpdateDTO
    {
        public string Resultado { get; set; }
    }
}