using APILABORATORIO.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using static LaboratorioClinico.Controllers.TipoExamenController;

namespace LaboratorioClinico.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PacienteController : ControllerBase
    {
        private readonly LaboratorioClinicoContext _context;
        public PacienteController(LaboratorioClinicoContext context)
        {
            _context = context;
        }
        public class PacienteDto
        {
            public int Idcliente { get; set; }

            public string Nombre { get; set; } = null!;

            public DateTime? FechaNacimiento { get; set; }

            public string? Genero { get; set; }

            public string? Direccion { get; set; }

            public string? Telefono { get; set; }

            public string? Email { get; set; }

            public string? Cedula { get; set; }
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Cliente>>> Get()
        {
            return await _context.Clientes.ToListAsync();
        }
        [HttpGet("{id}")]
        public async Task<ActionResult<Cliente>> GetIdCliente(int id)
        {
            var Cliente = await _context.Clientes.FindAsync(id);
            if (Cliente == null)
            {
                return NotFound();
            }
            return Cliente;
        }
        [HttpPost]
        public async Task<IActionResult> PosCliente([FromBody] PacienteDto cliente)
        {
            var newcliente = new Cliente
            {
                Nombre = cliente.Nombre,
                FechaNacimiento = cliente.FechaNacimiento.HasValue ? DateOnly.FromDateTime(cliente.FechaNacimiento.Value) : null,
                Genero = cliente.Genero,
                Telefono = cliente.Telefono,
            };
            _context.Clientes.Add(newcliente);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetIdCliente), new { id = newcliente.Idcliente }, newcliente);
        }
        [HttpPut("{id}")]
        public async Task<IActionResult> PutCliente(int id, [FromBody] PacienteDto clienteDto)
        {
            var ClienteExistente = await _context.Clientes.FindAsync(id);
            if (ClienteExistente == null)
            {
                return NotFound();
            }

            // Actualizar datos  
            ClienteExistente.Nombre = clienteDto.Nombre;
            ClienteExistente.FechaNacimiento = clienteDto.FechaNacimiento.HasValue ? DateOnly.FromDateTime(clienteDto.FechaNacimiento.Value) : null;
            ClienteExistente.Genero = clienteDto.Genero;
            ClienteExistente.Telefono = clienteDto.Telefono;

            _context.Entry(ClienteExistente).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ClienteExistentes(id))
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
            var Clienteexistente = await _context.Clientes.FindAsync(id);
            if (Clienteexistente == null)
            {
                return NotFound();
            }
            _context.Clientes.Remove(Clienteexistente);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        // Método corregido para verificar la existencia del cliente  
        private bool ClienteExistentes(int id)
        {
            return _context.Clientes.Any(e => e.Idcliente == id);
        }
    }
}
