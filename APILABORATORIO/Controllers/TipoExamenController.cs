using APILABORATORIO.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using static LaboratorioClinico.Controllers.OrdenController;

namespace LaboratorioClinico.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TipoExamenController : ControllerBase
    {
        private readonly LaboratorioClinicoContext _context;
        public TipoExamenController(LaboratorioClinicoContext context)
        {
            _context = context;
        }
        public class TipoexamenDto
        {
              public int  IdtipoExamen { get; set; }
              public string nombreExamen {get;set;}
              public string descripcion { get; set; }
            public decimal precio { get; set; }
            public string subtitulos { get; set; }
        }
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TipoExaman>>> Get()
        {
            return await _context.TipoExamen.ToListAsync();
        }
        [HttpGet("{id}")]
        public async Task<ActionResult<TipoExaman>> GetIdExamen(int id)
        {
            var TipoExaman = await _context.TipoExamen.FindAsync(id);
            if (TipoExaman == null)
            {
                return NotFound();
            }
            return TipoExaman;
        }
        [HttpPost]
        public async Task<IActionResult> PosTipoExamen([FromBody] TipoexamenDto examen)
        {
            var nuevoexmaen = new TipoExaman
            {
                IdtipoExamen = examen.IdtipoExamen,
                NombreExamen = examen.nombreExamen,
                Descripcion = examen.descripcion,
                Precio = examen.precio,
                Subtitulos = examen.subtitulos
            };
            _context.TipoExamen.Add(nuevoexmaen);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetIdExamen), new { id = nuevoexmaen.IdtipoExamen }, nuevoexmaen);
        }
        [HttpPut("{id}")]
        public async Task<IActionResult> PutTipoExaman(int id, TipoExaman TipoExaman)
        {
            if (id != TipoExaman.IdtipoExamen)
            {
                return BadRequest();
            }
            _context.Entry(TipoExaman).State = EntityState.Modified;
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!TipoExamanExistente(id))
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
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var TipoExamanexistente = await _context.TipoExamen.FindAsync(id);
            if (TipoExamanexistente == null)
            {
                return NotFound();
            }
            _context.TipoExamen.Remove(TipoExamanexistente);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        //verificar TipoExamanexistente
        private bool TipoExamanExistente(int id)
        {
            return _context.TipoExamen.Any(e => e.IdtipoExamen == id);
        }
    }
}
