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
    public class MedicoPasswordController : ControllerBase
    {
        private readonly LaboratorioClinicoContext _context;

        public MedicoPasswordController(LaboratorioClinicoContext context)
        {
            _context = context;
        }

        // DTO simplificado para actualización de contraseña
        public class UpdatePasswordDto
        {
            public string? Password { get; set; }
        }

        // Endpoint para actualizar la contraseña
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePassword(int id, [FromBody] UpdatePasswordDto passwordDto)
        {
            // Validar que la contraseña no sea nula o vacía
            if (string.IsNullOrEmpty(passwordDto.Password))
            {
                return BadRequest(new { message = "La contraseña no puede estar vacía" });
            }

            // Validar longitud mínima de contraseña
            if (passwordDto.Password.Length < 6)
            {
                return BadRequest(new { message = "La contraseña debe tener al menos 6 caracteres" });
            }

            // Buscar al médico en la base de datos
            var medico = await _context.Medicos.FindAsync(id);
            if (medico == null)
            {
                return NotFound(new { message = "Médico no encontrado" });
            }

            // Hashear la nueva contraseña
            var hashedPassword = HashContrasena(passwordDto.Password);

            // Validar que la nueva contraseña sea diferente a la actual
            if (medico.Password == hashedPassword)
            {
                return BadRequest(new { message = "La nueva contraseña debe ser diferente a la actual" });
            }

            // Actualizar la contraseña
            medico.Password = hashedPassword;
            _context.Entry(medico).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
                return Ok(new { message = "Contraseña actualizada exitosamente" });
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!MedicoExistente(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }
        }

        // Método para hashear la contraseña
        private string HashContrasena(string contrasena)
        {
            using var sha256 = SHA256.Create();
            var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(contrasena));
            return Convert.ToBase64String(hashedBytes);
        }

        // Método para verificar existencia del médico
        private bool MedicoExistente(int id)
        {
            return _context.Medicos.Any(e => e.Idmedico == id);
        }
    }
}