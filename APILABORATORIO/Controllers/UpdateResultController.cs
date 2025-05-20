using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using APILABORATORIO.Models;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace APILABORATORIO.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UpdateResultController : Controller
    {
        private readonly LaboratorioClinicoContext _context;

        public UpdateResultController(LaboratorioClinicoContext context)
        {
            _context = context;
        }

        // GET: api/Clientes/conResultados?nombre=Juan
[HttpGet("conResultados")]
public async Task<ActionResult<IEnumerable<ClienteConResultadosDTO>>> GetClientesConResultados([FromQuery] string nombre = "")
{
    var query = _context.Clientes
        .Include(c => c.Ordens)
            .ThenInclude(o => o.DetalleOrdens)
                .ThenInclude(d => d.IdtipoExamenNavigation) // Incluir TipoExamen
        .Where(c => string.IsNullOrEmpty(nombre) || c.Nombre.Contains(nombre))
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
                        .GroupBy(d => d.IdtipoExamenNavigation.NombreExamen) // Agrupar por tipo de examen
                        .Select(g => new ExamenConResultadosDTO
                        {
                            NombreExamen = g.Key,
                            Resultados = g.SelectMany(d => d.ResultadoExamen)
                                .Select(r => new ResultadoDTO
                                {
                                    IdResultado = r.Idresultado,
                                    NombreParametro = r.NombreParametro,
                                    Resultado = r.Resultado,
                                    FechaResultado = r.FechaResultado,
                                    OpcionesFijas = r.IdparametroNavigation.OpcionesFijas
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
        public List<ResultadoDTO> Resultados { get; set; }
         public List<ExamenConResultadosDTO> Examenes { get; set; }
    }

    public class ResultadoDTO
    {
        public int IdResultado { get; set; }
        public string NombreParametro { get; set; }
        public string Resultado { get; set; }
        public DateTime? FechaResultado { get; set; }
        public string? OpcionesFijas { get; set; } // Añadir esta línea
    }

    // Added missing DTO class
    public class ExamenConResultadosDTO
    {
        public int IdExamen { get; set; }
        public string NombreExamen { get; set; }
        public List<ResultadoDTO> Resultados { get; set; }
    }

    public class ResultadoUpdateDTO
    {
        public string Resultado { get; set; }
    }
 }


