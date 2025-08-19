using APILABORATORIO.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LaboratorioClinico.Controllers
{
    public class MostrarResultadosController : ControllerBase
    {
        private readonly LaboratorioClinicoContext _context;

        public MostrarResultadosController(LaboratorioClinicoContext context)
        {
            _context = context;
        }

        // GET: api/Resultados/Orden/{idOrden}
        [HttpGet("Orden/{idOrden}")]
        public async Task<ActionResult<ResultadoExamenCompletoDto>> GetResultadosPorOrden(int idOrden)
        {
            var resultado = await _context.Ordens
                .Where(o => o.Idorden == idOrden)
                .Select(o => new ResultadoExamenCompletoDto
                {
                    IdOrden = o.Idorden,
                    NumeroOrden = o.Idorden.ToString("D8"), // Formato de 8 dígitos
                    FechaOrden = o.FechaOrden,
                    Estado = o.Estado,

                    Paciente = new ResultadoPacienteDto
                    {
                        IdCliente = o.IdclienteNavigation.Idcliente,
                        Nombre = o.IdclienteNavigation.Nombre,
                        Genero = o.IdclienteNavigation.Genero,
                        Telefono = o.IdclienteNavigation.Telefono
                    },

                    Medico = o.IdmedicoNavigation != null ? new ResultadoMedicoDto
                    {
                        Nombre = o.IdmedicoNavigation.Nombre,
                        Especialidad = o.IdmedicoNavigation.Especialidad,
                    } : null,

                    Examenes = o.DetalleOrdens.Select(d => new ResultadoExamenDetalleDto
                    {
                        IdDetalleOrden = d.IddetalleOrden,
                        TipoExamen = d.IdtipoExamenNavigation.NombreExamen,
                        DescripcionExamen = d.IdtipoExamenNavigation.Descripcion,
                        Muestra = d.IdmuestraNavigation.Muestra1,
                        FechaResultado = d.ResultadoExamen.Max(r => r.FechaResultado),

                        Parametros = d.ResultadoExamen.Select(r => new ResultadoParametroDto
                        {
                            IdParametro = r.IdparametroNavigation.Idparametro,
                            NombreParametro = r.NombreParametro ?? r.IdparametroNavigation.NombreParametro,
                            Resultado = r.Resultado,
                            UnidadMedida = r.IdparametroNavigation.UnidadMedida,
                            ValorReferencia = r.IdparametroNavigation.ValorReferencia
                        }).ToList()
                    }).ToList()
                })
                .FirstOrDefaultAsync();

            if (resultado == null)
            {
                return NotFound("No se encontró la orden especificada");
            }

            return resultado;
        }
    }

    // DTOs específicos para este controlador
    public class ResultadoExamenCompletoDto
    {
        public int IdOrden { get; set; }
        public string NumeroOrden { get; set; }
        public DateTime? FechaOrden { get; set; }
        public string Estado { get; set; }
        public ResultadoPacienteDto Paciente { get; set; }
        public ResultadoMedicoDto Medico { get; set; }
        public List<ResultadoExamenDetalleDto> Examenes { get; set; }
    }

    public class ResultadoPacienteDto
    {
        public int IdCliente { get; set; }
        public string Nombre { get; set; }
        public string Cedula { get; set; }
        public string Genero { get; set; }
        public string Telefono { get; set; }
    }

    public class ResultadoMedicoDto
    {
        public string Nombre { get; set; }
        public string Especialidad { get; set; }
        public string Cedula { get; set; }
    }

    public class ResultadoExamenDetalleDto
    {
        public int IdDetalleOrden { get; set; }
        public string TipoExamen { get; set; }
        public string DescripcionExamen { get; set; }
        public string Muestra { get; set; }
        public DateTime? FechaResultado { get; set; }
        public List<ResultadoParametroDto> Parametros { get; set; }
    }

    public class ResultadoParametroDto
    {
        public int IdParametro { get; set; }
        public string NombreParametro { get; set; }
        public string Resultado { get; set; }
        public string UnidadMedida { get; set; }
        public string ValorReferencia { get; set; }
    }
}

