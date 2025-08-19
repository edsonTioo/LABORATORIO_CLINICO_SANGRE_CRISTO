using APILABORATORIO.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace LaboratorioClinico.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly LaboratorioClinicoContext _context;
        private readonly IConfiguration _configuracion;

        public AuthController(LaboratorioClinicoContext context, IConfiguration configuration)
        {
            _context = context;
            _configuracion = configuration;
        }
        public class LoginDto
        {
            public string Correo { get; set; }
            public string Password { get; set; }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto login)
        {
            // Hashear la contraseña ingresada por el usuario
            var hashedPassword = HashContrasena(login.Password);

            // Validar las credenciales del usuario
            var usuario = await _context.Medicos
                .FirstOrDefaultAsync(u => u.Correo == login.Correo && u.Password == hashedPassword);

            if (usuario == null)
            {
                return Unauthorized(new { Message = "Credenciales inválidas" });
            }

            // Generar el token JWT
            var token = GenerateToken(usuario.Correo);

            return Ok(new
            {
                Token = token,
                Nombre = usuario.Nombre,
                Correo = usuario.Correo,
                IdMedico = usuario.Idmedico,
                Rol = usuario.Rol
            });
        }

        // Método para hashear contraseñas
        private string HashContrasena(string contrasena)
        {
            using var sha256 = System.Security.Cryptography.SHA256.Create();
            var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(contrasena));
            return Convert.ToBase64String(hashedBytes);
        }

        // Método para generar el token JWT
        private string GenerateToken(string correo)
        {
            var jwtSettings = _configuracion.GetSection("Jwt");
            var key = Encoding.ASCII.GetBytes(jwtSettings["Key"]);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.Email, correo)
                }),
                Expires = DateTime.UtcNow.AddMinutes(double.Parse(jwtSettings["ExpireMinutes"])),
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature
                ),
                Issuer = jwtSettings["Issuer"],
                Audience = jwtSettings["Audience"]
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }
}
