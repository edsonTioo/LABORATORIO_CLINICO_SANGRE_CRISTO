using APILABORATORIO.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace APILABORATORIO.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class ControllerAnulador : ControllerBase
    {
        private readonly LaboratorioClinicoContext _context;

        public ControllerAnulador(LaboratorioClinicoContext context)
        {
            _context = context;
        }

        // Endpoint para anular una orden
        [HttpPut("anular-orden/{idOrden}")]
        public async Task<IActionResult> AnularOrden(int idOrden)
        {
            try
            {
                // Buscar la orden por ID
                var orden = await _context.Ordens.FindAsync(idOrden);

                if (orden == null)
                {
                    return NotFound($"No se encontró la orden con ID {idOrden}");
                }

                // Verificar si la orden ya está anulada
                if (orden.Estado == "ORDEN-ANULADA")
                {
                    return BadRequest("La orden ya está anulada");
                }

                // Cambiar el estado a "Anulada"
                orden.Estado = "ORDEN-ANULADA";
                _context.Ordens.Update(orden);

                // Guardar cambios
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    Mensaje = $"Orden {idOrden} anulada correctamente",
                    Orden = new
                    {
                        IdOrden = orden.Idorden,
                        Estado = orden.Estado,
                        FechaOrden = orden.FechaOrden,
                        IdCliente = orden.Idcliente,
                        IdMedico = orden.Idmedico
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }

        // Endpoint para verificar el estado de una orden
        [HttpGet("estado-orden/{idOrden}")]
        public async Task<IActionResult> VerEstadoOrden(int idOrden)
        {
            var orden = await _context.Ordens.FindAsync(idOrden);

            if (orden == null)
            {
                return NotFound($"No se encontró la orden con ID {idOrden}");
            }

            return Ok(new
            {
                IdOrden = orden.Idorden,
                Estado = orden.Estado,
                FechaOrden = orden.FechaOrden,
                IdCliente = orden.Idcliente,
                IdMedico = orden.Idmedico
            });
        }

        // Endpoint para listar todas las órdenes anuladas
        [HttpGet("ordenes-anuladas")]
        public async Task<IActionResult> GetOrdenesAnuladas()
        {
            var ordenesAnuladas = await _context.Ordens
                .Where(o => o.Estado == "ORDEN-ANULADA")
                .Select(o => new {
                    IdOrden = o.Idorden,
                    Estado = o.Estado,
                    FechaOrden = o.FechaOrden,
                    IdCliente = o.Idcliente,
                    IdMedico = o.Idmedico
                })
                .ToListAsync();

            return Ok(ordenesAnuladas);
        }
    }
}