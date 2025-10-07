using APILABORATORIO.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;

namespace LaboratorioClinico.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class MedicoUserController : ControllerBase
    {
        private readonly LaboratorioClinicoContext _context;

        public MedicoUserController(LaboratorioClinicoContext context)
        {
            _context = context;
        }

        // DTO para operaciones GET
        public class MedicoDto
        {
            public int Idmedico { get; set; }
            public string Nombre { get; set; } = null!;
            public string? Especialidad { get; set; }
            public string? Cedula { get; set; }
            public string? Password { get; set; } // Solo para lectura, no debería exponerse en producción
            public string? Direccion { get; set; }
            public int? Telefono { get; set; }
            public string? Correo { get; set; }
            public string? Rol { get; set; }
        }

        // DTO para operaciones POST/PUT
        public class MedicoInputDto
        {
            public int Idmedico { get; set; }
            public string Nombre { get; set; } = null!;
            public string Especialidad { get; set; } = null!;
            public string? Password { get; set; } // Opcional para actualización
            public int Telefono { get; set; }
            public string Correo { get; set; } = null!;
            public string Rol { get; set; } = null!;
        }

        // GET: api/MedicoUser
        [HttpGet]
        public async Task<ActionResult<IEnumerable<MedicoDto>>> Get()
        {
            var medicos = await _context.Medicos
                .Select(m => new MedicoDto
                {
                    Idmedico = m.Idmedico,
                    Nombre = m.Nombre,
                    Especialidad = m.Especialidad,
                    Password = null, // No exponer contraseñas hasheadas
                    Telefono = m.Telefono,
                    Correo = m.Correo,
                    Rol = m.Rol
                })
                .ToListAsync();

            return Ok(medicos);
        }

        // GET: api/MedicoUser/5
        [HttpGet("{id}")]
        public async Task<ActionResult<MedicoDto>> GetMedico(int id)
        {
            var medico = await _context.Medicos.FindAsync(id);

            if (medico == null)
            {
                return NotFound();
            }

            return new MedicoDto
            {
                Idmedico = medico.Idmedico,
                Nombre = medico.Nombre,
                Especialidad = medico.Especialidad,
                Password = null, // No exponer contraseña
                Telefono = medico.Telefono,
                Correo = medico.Correo,
                Rol = medico.Rol
            };
        }

        // POST: api/MedicoUser
        [HttpPost]
        public async Task<ActionResult<MedicoDto>> CreateMedico(MedicoInputDto medicoInput)
        {
            if (string.IsNullOrEmpty(medicoInput.Password))
            {
                return BadRequest("La contraseña es requerida");
            }

            var medico = new Medico
            {
                Nombre = medicoInput.Nombre,
                Especialidad = medicoInput.Especialidad,
                Password = HashContrasena(medicoInput.Password),
                Telefono = medicoInput.Telefono,
                Correo = medicoInput.Correo,
                Rol = medicoInput.Rol
            };

            _context.Medicos.Add(medico);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetMedico), new { id = medico.Idmedico }, new MedicoDto
            {
                Nombre = medico.Nombre,
                Especialidad = medico.Especialidad,
                Password = null,
                Telefono = medico.Telefono,
                Correo = medico.Correo,
                Rol = medico.Rol
            });
        }

        // PUT: api/MedicoUser/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateMedico(int id, MedicoInputDto medicoInput)
        {
            if (id != medicoInput.Idmedico)
            {
                return BadRequest("ID no coincide");
            }

            var medicoExistente = await _context.Medicos.FindAsync(id);
            if (medicoExistente == null)
            {
                return NotFound();
            }

            // Actualizar campos básicos
            medicoExistente.Nombre = medicoInput.Nombre;
            medicoExistente.Especialidad = medicoInput.Especialidad;
            medicoExistente.Telefono = medicoInput.Telefono;
            medicoExistente.Correo = medicoInput.Correo;
            medicoExistente.Rol = medicoInput.Rol;

            // Manejo seguro de contraseña
            if (!string.IsNullOrEmpty(medicoInput.Password))
            {
                // Solo actualizar si es una contraseña nueva (no hasheada)
                if (!IsHashedPassword(medicoInput.Password))
                {
                    medicoExistente.Password = HashContrasena(medicoInput.Password);
                }
                // Si ya está hasheada, asumimos que es la misma y no hacemos nada
            }

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!MedicoExists(id))
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

        // DELETE: api/MedicoUser/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMedico(int id)
        {
            var medico = await _context.Medicos.FindAsync(id);
            if (medico == null)
            {
                return NotFound();
            }

            _context.Medicos.Remove(medico);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool MedicoExists(int id)
        {
            return _context.Medicos.Any(e => e.Idmedico == id);
        }

        private string HashContrasena(string contrasena)
        {
            using var sha256 = SHA256.Create();
            var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(contrasena));
            return Convert.ToBase64String(hashedBytes);
        }

        private bool IsHashedPassword(string password)
        {
            // Un hash SHA-256 en Base64 tiene 44 caracteres
            if (password.Length != 44) return false;

            try
            {
                // Verificar que es un Base64 válido
                Convert.FromBase64String(password);
                return true;
            }
            catch
            {
                return false;
            }
        }
    }
}