using APILABORATORIO.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.Net.Mail;
using System.Net;
using System.Security.Cryptography;
using System.Text;

namespace LaboratorioClinico.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RestablecerController : ControllerBase
    {
        private readonly LaboratorioClinicoContext _context;

        public RestablecerController(LaboratorioClinicoContext context)
        {
            _context = context;
        }

        // DTO para recibir la solicitud de restablecimiento
        public class SolicitudRestablecimientoDto
        {
            [Required, EmailAddress]
            public string Correo { get; set; }
        }

        [HttpPost("solicitar")]
        public async Task<IActionResult> SolicitarRestablecimiento([FromBody] SolicitudRestablecimientoDto request)
        {
            var medico = await _context.Medicos.FirstOrDefaultAsync(m => m.Correo == request.Correo);

            if (medico == null)
            {
                // Respuesta genérica para evitar exposición de datos
                return Ok(new
                {
                    Exito = true,
                    Mensaje = "Si el correo existe en nuestro sistema, recibirás un correo con la información para restablecer tu contraseña."
                });
            }

            // Generar nueva contraseña temporal
            var nuevaContrasenaTemporal = GenerarContrasenaTemporal();
            medico.Password = HashContrasena(nuevaContrasenaTemporal); // Hashear la contraseña
            medico.ResetToken = null; // Limpiar cualquier token existente
            medico.ResetTokenExpires = null; // Limpiar expiración del token
            _context.Medicos.Update(medico);
            await _context.SaveChangesAsync();

            try
            {
                // Enviar correo con la contraseña temporal
                await EnviarCorreoBasico(medico.Correo, medico.Nombre, nuevaContrasenaTemporal);
                return Ok(new
                {
                    Exito = true,
                    Mensaje = "Si el correo existe en nuestro sistema, recibirás un correo con la información para restablecer tu contraseña."
                });
            }
            catch (Exception ex)
            {
                // Manejar errores y registrar en la consola
                Console.WriteLine($"Error al enviar correo: {ex.Message}");
                return StatusCode(500, new
                {
                    Exito = false,
                    Mensaje = "Ocurrió un error al procesar tu solicitud. Por favor intenta nuevamente."
                });
            }
        }

        private async Task EnviarCorreoBasico(string correo, string nombre, string contrasenaTemporal)
        {
            try
            {
                var mensaje = new MailMessage
                {
                    From = new MailAddress("jdallahack@gmail.com", "Laboratorio Clínico"),
                    Subject = "Nueva contraseña temporal",
                    Body = $@"
                        <html>
                            <body style='font-family: Arial, sans-serif;'>
                                <h2 style='color: #333;'>Hola, Dr(a). {nombre},</h2>
                                <p>Hemos generado una nueva contraseña temporal para tu cuenta:</p>
                                <p style='background-color: #f8f9fa; padding: 10px; border-radius: 5px; text-align: center; font-size: 18px; font-weight: bold;'>
                                    {contrasenaTemporal}
                                </p>
                                <p>Por seguridad, te recomendamos cambiar tu contraseña en cuanto inicies sesión.</p>
                                <p>Saludos,<br>Laboratorio Clínico</p>
                            </body>
                        </html>",
                    IsBodyHtml = true
                };

                mensaje.To.Add(correo);

                using var smtpClient = new SmtpClient("smtp.gmail.com", 587)
                {
                    Credentials = new NetworkCredential("jdallahack@gmail.com", "tydqmvmarzecrjks"), // Sustituye por tu contraseña de aplicación
                    EnableSsl = true
                };

                await smtpClient.SendMailAsync(mensaje);
                Console.WriteLine("Correo enviado correctamente.");
            }
            catch (Exception ex)
            {
                // Registrar el error
                Console.WriteLine($"Error al enviar correo: {ex.Message}");
                throw;
            }
        }

        private string GenerarContrasenaTemporal()
        {
            const string caracteresPermitidos = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*";
            var random = new Random();
            var contrasena = new char[10];

            for (int i = 0; i < contrasena.Length; i++)
            {
                contrasena[i] = caracteresPermitidos[random.Next(caracteresPermitidos.Length)];
            }

            return new string(contrasena);
        }

        private string HashContrasena(string contrasena)
        {
            using var sha256 = SHA256.Create();
            var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(contrasena));
            return Convert.ToBase64String(hashedBytes);
        }
    }
}