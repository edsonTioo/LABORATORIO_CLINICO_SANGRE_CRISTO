using APILABORATORIO.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LaboratorioClinico.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MuestraController : ControllerBase
    {
        private readonly LaboratorioClinicoContext _context;
        public MuestraController(LaboratorioClinicoContext context)
        {
            _context = context;
        }
        [HttpGet]
        public async Task <ActionResult<IEnumerable<Muestra>>>Get()
        {
            return await _context.Muestras.ToListAsync();
        }
        [HttpGet("{id}")]
        public async Task<ActionResult<Muestra>>GetIdMuestra(int id)
        {
            var muestra = await _context.Muestras.FindAsync(id);
            if(muestra == null)
            {
                return NotFound();
            }
            return muestra;
        }
        [HttpPost]
        public async Task<ActionResult<Muestra>> PosMuestra(Muestra muestra)
        {
            _context.Muestras.Add(muestra);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetIdMuestra), new { id = muestra.Id }, muestra);
        }
        [HttpPut("{id}")]
        public async Task<IActionResult> PutMedico(int id, Muestra muestra)
        {
            if (id != muestra.Id)
            {
                return BadRequest();
            }
            _context.Entry(muestra).State = EntityState.Modified;
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!MuestraExistente(id))
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
            var muestraexistente= await _context.Muestras.FindAsync(id);
            if (muestraexistente== null)
            {
                return NotFound();
            }
            _context.Muestras.Remove(muestraexistente);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        //verificar medicoexistente
        private bool MuestraExistente(int id)
        {
            return _context.Muestras.Any(e => e.Id == id);
        }
    }
}
