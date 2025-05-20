import React, { useEffect, useState, useCallback} from "react";
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Button,
  Platform,Dimensions,
  TouchableOpacity,
  ScrollView,
  Linking
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { DatePickerModal } from "react-native-paper-dates";
import { DataTable } from "react-native-paper";
import { format } from "date-fns";
import Toast from "react-native-toast-message";
import {
  MaterialIcons,
  FontAwesome,
  Ionicons, // Asegúrate de importar Ionicons
  Feather,
  AntDesign,
} from "@expo/vector-icons"; // Asegúrate de tener @expo/vector-icons instalado
import withAutoRefresh from "./withAutoRefresh"; // Asegúrate de importar el HOC


const FacturaScreen = ({ route }) => {
  const { userData } = route.params;
  const [clientes, setClientes] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [fechaFactura, setFechaFactura] = useState(new Date());
  const [openDate, setOpenDate] = useState(false);
  const [precio, setPrecio] = useState("");
  const [facturas, setFacturas] = useState([]);
  const [totalFactura, setTotalFactura] = useState(0);
const screenWidth = Dimensions.get('window').width;
  const [idFacturaGenerada, setIdFacturaGenerada] = useState(null);

    // Función para imprimir factura
    const imprimirFactura = () => {
      if (!idFacturaGenerada) {
        Toast.show({
          type: "error",
          text1: "❌ Error",
          text2: "No hay una factura generada para imprimir.",
          position: "top",
          visibilityTime: 3000,
        });
        return;
      }
  
      const URL_REPORTE =
        Platform.OS === "android"
          ? `http://10.0.2.2:5090/api/ReporteFactura/factura/${idFacturaGenerada}`
          : `http://localhost:5090/api/ReporteFactura/factura/${idFacturaGenerada}`;
  
      // Abrir el PDF en el navegador o visor de PDF del dispositivo
      Linking.openURL(URL_REPORTE).catch(err => {
        console.error("Error al abrir el PDF:", err);
        Toast.show({
          type: "error",
          text1: "❌ Error",
          text2: "No se pudo abrir el PDF de la factura.",
          position: "top",
          visibilityTime: 3000,
        });
      });
    };

  const API_URL_Ordenes_Pendientes =
    Platform.OS === "android"
      ? "http://10.0.2.2:5090/api/Factura/clientes-con-ordenes-pendientes"
      : "http://localhost:5090/api/Factura/clientes-con-ordenes-pendientes";

  useEffect(() => {
    fetch(API_URL_Ordenes_Pendientes)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.$values)) {
          const lista = data.$values.map((item) => ({
            label: item.nombre,
            value: item.idcliente.toString(),
          }));
          setClientes(lista);
        } else {
          console.error(
            "La respuesta no contiene un arreglo de clientes:",
            data
          );
        }
      })
      .catch((error) => console.error("Error al obtener clientes:", error));
  }, []);
  const reiniciarFormulario = useCallback(() => {
    setClienteSeleccionado(null);
    setOrdenSeleccionada(null);
    setFacturas([]);
    setTotalFactura(0);
    setPrecio("");
    setFechaFactura(new Date());
    setIdFacturaGenerada(null);
  }, []);
  useFocusEffect(
    useCallback(() => {
      reiniciarFormulario();
      return () => {}; // Limpieza opcional
    }, [reiniciarFormulario])
  );

  const API_URL_ORDENES =
    Platform.OS === "android"
      ? "http://10.0.2.2:5090/api/Factura/ordenes-pendientes"
      : "http://localhost:5090/api/Factura/ordenes-pendientes";

  useEffect(() => {
    if (clienteSeleccionado) {
      fetch(`${API_URL_ORDENES}/${clienteSeleccionado}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.$values)) {
            const lista = data.$values
              .map((item) => {
                if (item && item.iddetalleOrden) {
                  return {
                    label: item.nombreExamen,
                    value: item.iddetalleOrden.toString(),
                    precio: item.precio,
                    idorden: item.idorden,
                    nombreExamen: item.nombreExamen,
                  };
                }
                return null;
              })
              .filter((item) => item !== null);

            setOrdenes(lista);
          }
        })
        .catch((error) => console.error("Error al obtener órdenes:", error));
    }
  }, [clienteSeleccionado]);

  const onConfirmDate = ({ date }) => {
    setFechaFactura(date);
    setOpenDate(false);
  };

  const agregarDetalle = () => {
    // Validaciones específicas
    if (!clienteSeleccionado) {
      Toast.show({
        type: "warning",
        text1: "🚫Campo requerido",
        text2: "Debe seleccionar un cliente.",
      });
      return;
    }

    if (!ordenSeleccionada) {
      Toast.show({
        type: "warning",
        text1: "🚫Campo requerido",
        text2: "Debe seleccionar una Orden.",
      });
      return;
    }

    if (!fechaFactura) {
      Toast.show({
        type: "warning",
        text1: "🚫Campo requerido",
        text2: "Debe seleccionar una fecha.",
      });
      return;
    }

    if (!precio || isNaN(precio) || parseFloat(precio) <= 0) {
      Toast.show({
        type: "warning",
        text1: "🚫Precio inválido",
        text2: "Ingrese un precio válido mayor a 0.",
      });
      return;
    }

    
  // Verificar si ya hay detalles de otro cliente
  if (facturas.length > 0 && facturas[0].idcliente !== clienteSeleccionado) {
    Toast.show({
      type: "warning",
      text1: "❌ Cliente diferente",
      text2: "No puede agregar órdenes de diferentes clientes en la misma factura.",
    });
    return;
  }
    // Verificar si el examen ya fue agregado
    const examenExistente = facturas.find(
      (detalle) => detalle.orden === ordenSeleccionada
    );
    if (examenExistente) {
      Toast.show({
        type: "warning",
        text1: "❌Examen duplicado",
        text2: "Este examen ya ha sido agregado.",
      });
      return;
    }

    const ordenSeleccionadaObj = ordenes.find(
      (orden) => orden.value === ordenSeleccionada
    );
    if (!ordenSeleccionadaObj) {
      Toast.show({
        type: "warning",
        text1: "🚫Orden no válida",
        text2: "Orden seleccionada no válida.",
      });
      return;
    }

    const idOrden = ordenSeleccionadaObj.idorden;
    const clienteObj = clientes.find(
      (cliente) => cliente.value === clienteSeleccionado
    );
    const nombreCliente = clienteObj
      ? clienteObj.label
      : "Cliente no encontrado";
    const subtotal = parseFloat(precio);
    const nombreExamen =
      ordenSeleccionadaObj.nombreExamen || "Tipo no disponible";

    const nuevoDetalle = {
      idcliente: clienteSeleccionado,
      nombre: nombreCliente,
      orden: ordenSeleccionada,
      precio: parseFloat(precio),
      subtotal: subtotal,
      fecha: format(fechaFactura, "yyyy-MM-dd"),
      idorden: idOrden,
      nombreExamen: nombreExamen,
    };

    setFacturas([...facturas, nuevoDetalle]);
    setTotalFactura((prev) => prev + subtotal);
    setOrdenSeleccionada(null);
    setPrecio("");
  };
  const eliminarDetalle = (index) => {
    const nuevasFacturas = [...facturas];
    const eliminado = nuevasFacturas.splice(index, 1)[0];
    setFacturas(nuevasFacturas);
    setTotalFactura((prev) => prev - eliminado.subtotal);
    Toast.show({
      type: "error",
      text1: "❌Detalle eliminado",
      text2: `Se eliminó el examen "${eliminado.nombreExamen}" correctamente.`,
    });
  };

  const guardarFactura = () => {
    if (facturas.length === 0) {
      Toast.show({
        type: "error",
        text1: "🚫 No hay detalles",
        text2: "Agrega al menos un examen para guardar la factura.",
        position: "top",
        visibilityTime: 3000,
      });
      return;
    }
  
    console.log("Preparando datos para guardar factura...");
    const factura = {
      idcliente: parseInt(clienteSeleccionado),
      idmedico: userData.idMedico || userData.userId,
      fechaFactura: fechaFactura.toISOString(),
      total: totalFactura,
      detalleFacturas: facturas.map((detalle) => ({
        iddetalleOrden: parseInt(detalle.orden),
        precio: detalle.precio,
        subtotal: detalle.subtotal,
      })),
    };
  
    console.log("Datos de la factura a enviar:", factura);
  
    const URL_FACTURA =
      Platform.OS === "android"
        ? "http://10.0.2.2:5090/api/Factura"
        : "http://localhost:5090/api/Factura";
  
    fetch(URL_FACTURA, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(factura),
    })
      .then(async (res) => {
        console.log("Respuesta del servidor recibida, status:", res.status);
        const contentType = res.headers.get("Content-Type");
        const text = await res.text();
  
        if (contentType && contentType.includes("application/json")) {
          try {
            const jsonData = JSON.parse(text);
            console.log("Respuesta JSON del servidor:", jsonData);
            return jsonData;
          } catch (err) {
            console.error("Error al parsear JSON:", err);
            throw new Error(`Respuesta no válida del servidor: ${text}`);
          }
        } else {
          console.log("Respuesta de texto del servidor:", text);
          return text;
        }
      })
      .then((data) => {
        console.log("Procesando respuesta del servidor:", data);
  
        // Caso 1: Respuesta JSON con idfactura (minúscula)
        if (typeof data === 'object' && data.idfactura !== undefined) {
          console.log("Respuesta contiene idfactura:", data.idfactura);
          setIdFacturaGenerada(data.idfactura);
          
          // Actualizar estado de la orden
          const idOrden = facturas[0]?.idorden;
          if (idOrden) {
            actualizarEstadoOrden(idOrden);
          }
  
          Toast.show({
            type: "success",
            text1: "✅ Factura guardada",
            text2: `Factura #${data.idfactura} creada correctamente.`,
            position: "top",
            visibilityTime: 3000,
          });
          
          setFacturas([]);
          setTotalFactura(0);
          setClienteSeleccionado(null);
          setFechaFactura(new Date());
          return;
        }
  
        // Caso 2: Respuesta JSON con idFactura (mayúscula por compatibilidad)
        if (typeof data === 'object' && data.idFactura !== undefined) {
          console.log("Respuesta contiene idFactura:", data.idFactura);
          setIdFacturaGenerada(data.idFactura);
          
          // Actualizar estado de la orden
          const idOrden = facturas[0]?.idorden;
          if (idOrden) {
            actualizarEstadoOrden(idOrden);
          }
  
          Toast.show({
            type: "success",
            text1: "✅ Factura guardada",
            text2: `Factura #${data.idFactura} creada correctamente.`,
            position: "top",
            visibilityTime: 3000,
          });
          
          setFacturas([]);
          setTotalFactura(0);
          setClienteSeleccionado(null);
          setFechaFactura(new Date());
          return;
        }
  
        // Resto de tu lógica original...
        if (typeof data === "string") {
          console.log("Respuesta es texto:", data);
          if (data.includes("El estado de la orden ha sido actualizado")) {
            const match = data.match(/Factura generada con ID: (\d+)/);
            console.log("Resultado de la búsqueda del ID:", match);
            if (match && match[1]) {
              const newId = parseInt(match[1]);
              console.log("ID de factura encontrado:", newId);
              setIdFacturaGenerada(newId);
            }
            Toast.show({
              type: "success",
              text1: "✅ Factura guardada",
              text2: "Estado de la orden actualizado a FACTURADO.",
              position: "top",
              visibilityTime: 3000,
            });
            setFacturas([]);
            setTotalFactura(0);
            setClienteSeleccionado(null);
            setFechaFactura(new Date());
          } else {
            console.log("No se encontró el mensaje de éxito en la respuesta");
            Toast.show({
              type: "error",
              text1: "❌ Error al guardar",
              text2: "No se pudo registrar la factura.",
              position: "top",
              visibilityTime: 3000,
            });
          }
          return;
        }
  
        // Resto de tu lógica original para otros casos...
        if (data.errors) {
          console.log("Errores de validación:", data.errors);
          Toast.show({
            type: "error",
            text1: "❌ Error de validación",
            text2: "Revisa los datos antes de guardar.",
            position: "top",
            visibilityTime: 3000,
          });
          return;
        }
  
        // Respuesta no manejada
        console.log("Respuesta no manejada:", data);
        const idOrden = facturas[0]?.idorden;
  
        if (!idOrden) {
          console.error("El idorden no está disponible");
          Toast.show({
            type: "error",
            text1: "❌ Error",
            text2: "El ID de la orden no es válido.",
            position: "top",
            visibilityTime: 3000,
          });
          return;
        }
  
        // Actualizar estado de la orden en caso de respuesta no manejada
        actualizarEstadoOrden(idOrden);
      })
      .catch((err) => {
        console.error("Error en la petición:", err.message);
        Toast.show({
          type: "error",
          text1: "❌ Error inesperado",
          text2: err.message,
          position: "top",
          visibilityTime: 3000,
        });
      });
  };
  
  // Función auxiliar para actualizar el estado de la orden
  const actualizarEstadoOrden = (idOrden) => {
    console.log("Actualizando estado de la orden con ID:", idOrden);
    const URL_ORDEN =
      Platform.OS === "android"
        ? "http://10.0.2.2:5090/api/Orden"
        : "http://localhost:5090/api/Orden";
  
    fetch(`${URL_ORDEN}/${idOrden}`, {
      method: "PUT",
    })
      .then((res) => res.text())
      .then((updateData) => {
        console.log("Respuesta de actualización de orden:", updateData);
        if (updateData.includes("El estado de la orden ha sido actualizado")) {
          console.log("Estado de orden actualizado exitosamente");
        } else {
          console.log("No se pudo actualizar el estado de la orden");
        }
      })
      .catch((err) => {
        console.error("Error al actualizar la orden:", err);
      });
  };

  // Agrega este useEffect para depurar cuando cambia idFacturaGenerada
  useEffect(() => {
    console.log("idFacturaGenerada ha cambiado:", idFacturaGenerada);
  }, [idFacturaGenerada]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Sección de formulario */}
        <View style={styles.formContainer}>
{/* Campo Cliente */}
<View style={styles.fieldContainer}>
  <Text style={styles.label}>Cliente:</Text>
  <View style={styles.inputContainer}>
    <FontAwesome name="user" size={18} color="#555" style={styles.icon} />
    <Dropdown
      data={clientes}
      labelField="label"
      valueField="value"
      value={clienteSeleccionado}
      onChange={(item) => setClienteSeleccionado(item.value)}
      placeholder="Seleccionar Cliente"
      style={styles.dropdown}
      placeholderStyle={styles.placeholderStyle}
      selectedTextStyle={styles.selectedTextStyle}
      search
      searchPlaceholder="Buscar cliente..."
      inputSearchStyle={styles.searchInput}
    />
  </View>
</View>

{/* Campo Orden */}
<View style={styles.fieldContainer}>
  <Text style={styles.label}>Orden:</Text>
  <View style={styles.inputContainer}>
    <MaterialIcons name="assignment" size={18} color="#555" style={styles.icon} />
    <Dropdown
      data={ordenes}
      labelField="label"
      valueField="value"
      value={ordenSeleccionada}
      onChange={(item) => {
        setOrdenSeleccionada(item.value);
        setPrecio(item.precio.toString());
      }}
      placeholder="Seleccionar Orden"
      style={styles.dropdown}
      placeholderStyle={styles.placeholderStyle}
      selectedTextStyle={styles.selectedTextStyle}
      search
      searchPlaceholder="Buscar orden..."
      inputSearchStyle={styles.searchInput}
    />
  </View>
</View>

          {/* Campo Precio */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Precio:</Text>
            <View style={styles.inputContainer}>
              <FontAwesome
                name="money"
                size={18}
                color="#555"
                style={styles.icon}
              />
              <TextInput
                value={precio}
                editable={false}
                style={styles.input}
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Campo Fecha */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Fecha:</Text>
            <TouchableOpacity
              onPress={() => setOpenDate(true)}
              style={styles.inputContainer}
            >
              <Feather
                name="calendar"
                size={18}
                color="#555"
                style={styles.icon}
              />
              <Text style={styles.dateText}>
                {format(fechaFactura, "yyyy-MM-dd")}
              </Text>
            </TouchableOpacity>
            <DatePickerModal
              locale="es"
              mode="single"
              visible={openDate}
              onDismiss={() => setOpenDate(false)}
              date={fechaFactura}
              onConfirm={onConfirmDate}
              saveLabel="Guardar"
              cancelLabel="Cancelar"
            />
          </View>

          {/* Botón Agregar */}
          <TouchableOpacity style={styles.addButton} onPress={agregarDetalle}>
            <View style={styles.buttonContent}>
              <AntDesign name="plus" size={20} color="white" />
              <Text style={styles.buttonLabel}>Agregar</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Tabla de detalles - MANTENGO EXACTAMENTE TU ESTRUCTURA ORIGINAL */}
        <ScrollView horizontal={true} style={{flex:1}}>

        <DataTable style={[styles.table,  {minWidth: screenWidth }]}>
          <DataTable.Header style={styles.tableHeader}>
            <DataTable.Title style={styles.columnHeader}>
            <Text style={styles.headerTextblanco}>Cliente</Text> 
            </DataTable.Title>
            <DataTable.Title style={styles.columnHeader}>
              <Text style={styles.headerTextblanco}>Orden</Text> 
              </DataTable.Title>
            <DataTable.Title style={styles.columnHeader}>
            <Text style={styles.headerTextblanco}>Examen</Text>  
            </DataTable.Title>
            <DataTable.Title style={styles.columnHeader}>
             <Text style={styles.headerTextblanco}>Precio</Text>  
            </DataTable.Title>
            <DataTable.Title style={styles.columnHeader}>
             <Text style={styles.headerTextblanco}>Subtotal</Text>  
            </DataTable.Title>
            <DataTable.Title style={styles.columnHeader}>
              <Text style={styles.headerTextblanco}>Fecha</Text> 
              </DataTable.Title>
            <DataTable.Title style={styles.columnHeader}>
              <Text style={styles.headerTextblanco}>Acciones</Text> 
            </DataTable.Title>
          </DataTable.Header>

          {facturas.map((detalle, index) => (
            <DataTable.Row key={index} style={styles.tableRow}>
              <DataTable.Cell style={styles.tableCell}>
                {detalle.nombre}
              </DataTable.Cell>
              <DataTable.Cell style={styles.tableCell}>
                {detalle.idorden}
              </DataTable.Cell>
              <DataTable.Cell style={styles.tableCell}>
                {detalle.nombreExamen}
              </DataTable.Cell>
              <DataTable.Cell style={styles.tableCell}>
                {detalle.precio}
              </DataTable.Cell>
              <DataTable.Cell style={styles.tableCell}>
                {detalle.subtotal}
              </DataTable.Cell>
              <DataTable.Cell style={styles.tableCell}>
                {detalle.fecha}
              </DataTable.Cell>
              <DataTable.Cell style={styles.tableCell}>
                <TouchableOpacity
                  onPress={() => eliminarDetalle(index)}
                  style={styles.deleteButton}
                >
                  <Feather name="trash-2" size={18} color="#e74c3c" />
                </TouchableOpacity>
              </DataTable.Cell>
            </DataTable.Row>
          ))}

          {/* Total - MANTENGO TU ESTRUCTURA ORIGINAL */}
          <DataTable.Row style={styles.totalRow}>
            <DataTable.Cell>Total</DataTable.Cell>
            <DataTable.Cell style={styles.totalCell}>
              {totalFactura.toFixed(2)}
            </DataTable.Cell>
          </DataTable.Row>
        </DataTable>
        </ScrollView>

        {/* Botón Guardar Factura */}
        <TouchableOpacity style={styles.saveButton} onPress={guardarFactura}>
          <View style={styles.buttonContent}>
            <Feather name="save" size={20} color="white" />
            <Text style={styles.buttonLabel}>Guardar Factura</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
      {/* Botón Imprimir Factura - con console.log para depurar su renderizado */}
      {idFacturaGenerada ? (
        <TouchableOpacity 
          style={styles.printButton} 
          onPress={imprimirFactura}
          onLayout={() => console.log("Botón de imprimir renderizado")}
        >
          <View style={styles.buttonContent}>
            <Feather name="printer" size={20} color="white" />
            <Text style={styles.buttonLabel}>Imprimir Factura #{idFacturaGenerada}</Text>
          </View>
        </TouchableOpacity>
      ) : (
        console.log("No hay idFacturaGenerada, no se renderiza botón de imprimir")
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: "#2c3e50",
  },
  formContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#34495e",
    marginBottom: 6,
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: "#dfe6e9",
  },
  icon: {
    marginRight: 10,
    color: "#7f8c8d",
  },
  dropdown: {
    flex: 1,
    height: "100%",
    backgroundColor: "transparent",
  },

  placeholderStyle: {
    color: "#bdc3c7",
    fontSize: 15,
  },
  selectedTextStyle: {
    color: "#2c3e50",
    fontSize: 15,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 15,
    color: "#2c3e50",
  },
  dateText: {
    flex: 1,
    fontSize: 15,
    color: "#2c3e50",
  },
  table: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  tableHeader: {
    backgroundColor: "#2c3e50",
  },
  columnHeader: {
    justifyContent: "center",
  },
  tableRow: {
    borderBottomWidth: 1,
    borderBottomColor: "#ecf0f1",
  },
  tableCell: {
    justifyContent: "center",
    paddingVertical: 12,
  },
  deleteText: {
    color: "#e74c3c",
    fontSize: 14,
  },
  totalRow: {
    backgroundColor: "#e3f2fd",
    justifyContent: "center",
  },
  totalCell: {
    fontWeight: "bold",
    color: "#1976d2",
    fontSize: 16,
    textAlign: "center",
    flex: 1,
  },
  addButton: {
    backgroundColor: "#2196F3", // Azul
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  saveButton: {
    backgroundColor: "#4CAF50", // Verde
    borderRadius: 8,
    paddingVertical: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  deleteButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#fde8e8',
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginLeft: 8,
  },
  printButton: {
    backgroundColor: "#FF9800",
    borderRadius: 8,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    position: 'absolute', // Posicionamiento absoluto
    bottom: 0, // Fijo en la parte inferior
    left: 16,
    right: 16,
  },headerTextblanco:
  {
      color: "#ffffff",
  }
});

export default withAutoRefresh(FacturaScreen);
