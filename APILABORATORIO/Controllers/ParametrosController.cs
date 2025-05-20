using APILABORATORIO.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Reflection.Metadata;
using static LaboratorioClinico.Controllers.PacienteController;

namespace LaboratorioClinico.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ParametrosController : ControllerBase
    {
        private readonly LaboratorioClinicoContext _context;
        public ParametrosController(LaboratorioClinicoContext context)
        {
            _context = context;
        }

        public class ParametroDto
        {
            public int Idparametro { get; set; }
            public int? IdtipoExamen { get; set; }
            public string NombreParametro { get; set; } = "Sin nombre";
            public string Subtitulo { get; set; } = "General";
            public string UnidadMedida { get; set; } = "Sin unidad";
            public string ValorReferencia { get; set; } = "Sin referencia";
            public virtual TipoExaman? TipoExamen { get; set; }
            public string NombreExamen { get; set; } = "Sin examen";
            public string OpcionesFijas { get; set; } = "Sin opciones";
        }

        public class ParametroDto2
        {
            public int Idparametro { get; set; }
            public int? IdtipoExamen { get; set; }
            public string NombreParametro { get; set; } = "Sin nombre";
            public string Subtitulo { get; set; } = "General";
            public string? UnidadMedida { get; set; }
            public string? OpcionesFijas { get; set; }
            public string? ValorReferencia { get; set; }
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ParametroDto>>> Get()
        {
            try
            {
                var parametros = await _context.Parametros
                    .Include(p => p.IdtipoExamenNavigation)
                    .AsNoTracking()
                    .Select(p => new ParametroDto
                    {
                        Idparametro = p.Idparametro,
                        IdtipoExamen = p.IdtipoExamen,
                        NombreParametro = p.NombreParametro ?? "Sin nombre",
                        Subtitulo = p.Subtitulo ?? "General",
                        UnidadMedida = p.UnidadMedida ?? "Sin unidad",
                        ValorReferencia = p.ValorReferencia ?? "Sin referencia",
                        TipoExamen = p.IdtipoExamenNavigation,
                        NombreExamen = p.IdtipoExamenNavigation != null ?
                            p.IdtipoExamenNavigation.NombreExamen : "Sin examen",
                        OpcionesFijas = p.OpcionesFijas ?? "Sin opciones"
                    })
                    .ToListAsync();

                return Ok(parametros);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al obtener parámetros: {ex.Message}");
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Parametro>> GetIdparametros(int id)
        {
            var parametros = await _context.Parametros.FindAsync(id);
            if (parametros == null)
            {
                return NotFound();
            }
            return parametros;
        }

        [HttpPost]
        public async Task<IActionResult> PosParametro([FromBody] ParametroDto2 parametros)
        {
            try
            {
                var newparametros = new Parametro
                {
                    IdtipoExamen = parametros.IdtipoExamen,
                    NombreParametro = parametros.NombreParametro ?? "Sin nombre",
                    Subtitulo = parametros.Subtitulo,
                    UnidadMedida = parametros.UnidadMedida,
                    ValorReferencia = parametros.ValorReferencia,
                    OpcionesFijas = parametros.OpcionesFijas ?? "Sin opciones"
                };

                _context.Parametros.Add(newparametros);
                await _context.SaveChangesAsync();

                return CreatedAtAction("GetIdparametros",
                    new { id = newparametros.Idparametro },
                    new
                    {
                        newparametros.Idparametro,
                        newparametros.NombreParametro,
                        newparametros.Subtitulo,
                        newparametros.UnidadMedida,
                        newparametros.ValorReferencia,
                        newparametros.OpcionesFijas
                    });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al crear parámetro: {ex.Message}");
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Putparametro(int id, [FromBody] ParametroDto2 parametro)
        {
            try
            {
                var existingParametro = await _context.Parametros.FindAsync(id);
                if (existingParametro == null)
                {
                    return NotFound();
                }

                existingParametro.IdtipoExamen = parametro.IdtipoExamen;
                existingParametro.NombreParametro = parametro.NombreParametro ?? "Sin nombre";
                existingParametro.Subtitulo = parametro.Subtitulo;
                existingParametro.UnidadMedida = parametro.UnidadMedida;
                existingParametro.ValorReferencia = parametro.ValorReferencia;
                existingParametro.OpcionesFijas = parametro.OpcionesFijas ?? "Sin opciones";

                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al actualizar parámetro: {ex.Message}");
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var parametro = await _context.Parametros.FindAsync(id);
                if (parametro == null)
                {
                    return NotFound();
                }

                _context.Parametros.Remove(parametro);
                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al eliminar parámetro: {ex.Message}");
            }
        }

        private bool ParametroExistente(int id)
        {
            return _context.Parametros.Any(e => e.Idparametro == id);
        }
    }
}