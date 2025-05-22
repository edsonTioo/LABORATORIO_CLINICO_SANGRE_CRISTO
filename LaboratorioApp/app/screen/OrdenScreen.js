import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
  TouchableOpacity,
  ScrollView,Dimensions
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { DatePickerModal } from 'react-native-paper-dates';
import { DataTable } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { format } from "date-fns";
import {
  MaterialIcons,
  FontAwesome,
  Feather,
  AntDesign,
} from '@expo/vector-icons';
import CreateClientModal from '../components/ComponentsMedico/CreateClientModal';
import withAutoRefresh from './withAutoRefresh';
const OrdenScreen = () => {
  // URLs de la API
  const API_URL_MEDICO = Platform.OS === 'android'
    ? "http://10.0.2.2:5090/api/MedicoUser"
    : "http://localhost:5090/api/MedicoUser";
  const API_URL_TIPOEXAMEN = Platform.OS === "android"
    ? "http://10.0.2.2:5090/api/TipoExamen"
    : "http://localhost:5090/api/TipoExamen";
  const API_URL_CLIENTE = Platform.OS === 'android'
    ? "http://10.0.2.2:5090/api/Paciente"
    : "http://localhost:5090/api/Paciente";
  const API_URL_MUESTRA = Platform.OS === 'android'
    ? "http://10.0.2.2:5090/api/Muestra"
    : "http://localhost:5090/api/Muestra";
  const API_URL_ORDEN = Platform.OS === 'android'
    ? "http://10.0.2.2:5090/api/Orden"
    : "http://localhost:5090/api/Orden";
const screenWidth = Dimensions.get('window').width;
  // Estados
  const [medico, setMedico] = useState([]);
  const [searchMedico, setSearchMedico] = useState('');
  const [searchCliente, setSearchCliente] = useState('');
  const [cliente, setCliente] = useState([]);
  const [muestra, setMuestra] = useState([]);
  const [tipoexamen, setTipoExamen] = useState([]);const [isClientModalVisible, setIsClientModalVisible] = useState(false);
  const [openDate, setOpenDate] = useState(false);
  const [openDate2, setOpenDate2] = useState(false);
  const [form, setForm] = useState({
    idcliente: null,
    idmedico: null,
    fechaOrden: new Date(),
    fechaEntrega: new Date(),
    estado: 'PENDIENTE',
    detalleOrdens: []
  });

  const [detalleTemporal, setDetalleTemporal] = useState({
    idtipoExamen: null,
    idmuestra: null
  });

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [medicosRes, clientesRes, muestrasRes, examenesRes] = await Promise.all([
          fetch(API_URL_MEDICO).then(res => res.json()),
          fetch(API_URL_CLIENTE).then(res => res.json()),
          fetch(API_URL_MUESTRA).then(res => res.json()),
          fetch(API_URL_TIPOEXAMEN).then(res => res.json())
        ]);

        setMedico(medicosRes.$values || []);
        setCliente(clientesRes.$values || []);
        setMuestra(muestrasRes.$values || []);
        setTipoExamen(examenesRes.$values || []);

      } catch (err) {
        console.error("Error fetching data:", err);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Error al cargar los datos',
        });
      }
    };

    fetchData();
  }, []);
    const reiniciarFormulario = useCallback(() => {
      setForm({
        idcliente: null,
        idmedico: null,
        fechaOrden: new Date(),
        fechaEntrega: new Date(),
        estado: 'PENDIENTE',
        detalleOrdens: []
      });
    }, []);
  
    useFocusEffect(
      useCallback(() => {
        reiniciarFormulario(); // Se ejecuta al entrar a la pantalla
        return () => {}; // Limpieza opcional (no necesaria aquí)
      }, [reiniciarFormulario])
    );

  // Preparar datos para dropdowns
  const medicosData = medico.map(med => ({
    value: med.idmedico.toString(),
    label: med.nombre,
    idmedico: med.idmedico
  }));

  const clientesData = cliente.map(cli => ({
    value: cli.idcliente.toString(),
    label: cli.nombre,
    idcliente: cli.idcliente
  }));

  const muestraData = muestra.map(mue => ({
    value: mue.id.toString(),
    label: mue.muestra1,
    id: mue.id
  }));

  const tipoexamenData = tipoexamen.map(tap => ({
    value: tap.idtipoExamen.toString(),
    label: tap.nombreExamen,
    idtipoExamen: tap.idtipoExamen
  }));

  // Filtrar los datos ya mapeados
  const filteredMedicos = medicosData.filter(item =>
    item.label.toLowerCase().includes(searchMedico.toLowerCase())
  );

  const filteredClientes = clientesData.filter(item =>
    item.label.toLowerCase().includes(searchCliente.toLowerCase())
  );

  // Manejar selección de fecha
  const onConfirmDate = ({ date }) => {
    setForm(prev => ({ ...prev, fechaOrden: date }));
    setOpenDate(false);
  };

  const onConfirmDate2 = ({ date }) => {
    setForm(prev => ({ ...prev, fechaEntrega: date }));
    setOpenDate2(false);
  };

  // Agregar detalle a la orden
  const agregarDetalle = () => {
    if (!detalleTemporal.idtipoExamen || !detalleTemporal.idmuestra) {
      Toast.show({
        type: 'warning',
        text1: '🚫 Campos requeridos',
        text2: 'Seleccione tipo de examen y muestra',
      });
      return;
    }

    const examenSeleccionado = tipoexamenData.find(
      e => e.value === detalleTemporal.idtipoExamen
    );
    const muestraSeleccionada = muestraData.find(
      m => m.value === detalleTemporal.idmuestra
    );

    if (!examenSeleccionado || !muestraSeleccionada) {
      Toast.show({
        type: 'error',
        text1: '❌ Error',
        text2: 'No se encontró el examen o muestra seleccionada',
      });
      return;
    }

    const nuevoDetalle = {
      idtipoExamen: parseInt(detalleTemporal.idtipoExamen),
      idmuestra: parseInt(detalleTemporal.idmuestra),
      nombreExamen: examenSeleccionado.label,
      nombreMuestra: muestraSeleccionada.label
    };

    setForm(prev => ({
      ...prev,
      detalleOrdens: [...prev.detalleOrdens, nuevoDetalle]
    }));

    setDetalleTemporal({
      idtipoExamen: null,
      idmuestra: null
    });

    Toast.show({
      type: 'success',
      text1: '✅ Detalle agregado',
      text2: 'Examen añadido a la orden',
    });
  };

  // Eliminar detalle
  const eliminarDetalle = (index) => {
    const nuevosDetalles = [...form.detalleOrdens];
    const eliminado = nuevosDetalles.splice(index, 1)[0];
    setForm(prev => ({ ...prev, detalleOrdens: nuevosDetalles }));

    Toast.show({
      type: 'error',
      text1: '❌ Detalle eliminado',
      text2: `Se eliminó el examen "${eliminado.nombreExamen}"`,
    });
  };

  // Guardar orden
  const guardarOrden = async () => {
    if (!form.idcliente || !form.idmedico) {
      Toast.show({
        type: 'warning',
        text1: '🚫 Campos requeridos',
        text2: 'Seleccione médico y cliente',
      });
      return;
    }
    if (!form.fechaOrden || !form.fechaEntrega) {
      Toast.show({
        type: 'warning',
        text1: '🚫 Campos requeridos',
        text2: 'Seleccione fechas válidas',
      });
      return;
    }


    if (form.detalleOrdens.length === 0) {
      Toast.show({
        type: 'warning',
        text1: '🚫 Sin detalles',
        text2: 'Agregue al menos un examen',
      });
      return;
    }

    const ordenParaEnviar = {
      idcliente: parseInt(form.idcliente),
      idmedico: parseInt(form.idmedico),
      fechaOrden: form.fechaOrden.toISOString(),
      fechaEntrega: form.fechaEntrega.toISOString(),
      estado: 'Pendiente',
      detalleOrdens: form.detalleOrdens.map(detalle => ({
        idtipoExamen: detalle.idtipoExamen,
        idmuestra: detalle.idmuestra
      }))
    };

    try {
      const response = await fetch(API_URL_ORDEN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ordenParaEnviar)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Orden guardada:', data);

      // Resetear formulario
      setForm({
        idcliente: null,
        idmedico: null,
        fechaOrden: new Date(),
        fechaEntrega: new Date(),
        estado: 'Pendiente',
        detalleOrdens: []
      });

      Toast.show({
        type: 'success',
        text1: '✅ Orden guardada',
        text2: 'La orden se ha registrado correctamente',
      });

    } catch (error) {
      console.error('Error al guardar la orden:', error);
      Toast.show({
        type: 'error',
        text1: '❌ Error',
        text2: 'No se pudo guardar la orden',
      });
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Sección de formulario */}
        <View style={styles.formContainer}>
          {/* Campo Médico */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Médico:</Text>
            <View style={styles.inputContainer}>
              <Dropdown
                data={filteredMedicos}
                labelField="label"
                valueField="value"
                value={form.idmedico?.toString()}
                onChange={(item) => {
                  setForm(prev => ({ ...prev, idmedico: item.value }));
                  setSearchMedico('');
                }}
                onChangeText={setSearchMedico}
                placeholder="Seleccionar Médico"
                style={styles.dropdown}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                search
                searchPlaceholder="Buscar médico..."
                renderLeftIcon={() => (
                  <FontAwesome name="user-md" size={18} color="#555" style={styles.dropdownIcon} />
                )}
              />
            </View>
          </View>

          {/* Campo Cliente */}
<View style={styles.fieldContainer}>
  <Text style={styles.label}>Cliente:</Text>
  
  {/* Contenedor para pantallas grandes (dropdown y botón en fila) */}
  <View style={styles.clientInputContainer}>
    <View style={[styles.inputContainer, styles.flexGrow]}>
      <Dropdown
        data={filteredClientes}
        labelField="label"
        valueField="value"
        value={form.idcliente?.toString()}
        onChange={(item) => {
          setForm(prev => ({ ...prev, idcliente: item.value }));
          setSearchCliente('');
        }}
        onChangeText={setSearchCliente}
        placeholder="Seleccionar Cliente"
        style={styles.dropdown}
        placeholderStyle={styles.placeholderStyle}
        selectedTextStyle={styles.selectedTextStyle}
        search
        searchPlaceholder="Buscar cliente..."
        renderLeftIcon={() => (
          <FontAwesome name="user" size={18} color="#555" style={styles.dropdownIcon} />
        )}
      />
    </View>
    
    {/* Botón que en móvil se coloca debajo */}
    <View style={styles.clientButtonWrapper}>
      <TouchableOpacity 
        onPress={() => setIsClientModalVisible(true)}
        style={styles.addClientButton}
      >
        <AntDesign name="plus" size={16} color="white" />
        <Text style={styles.addClientButtonText}>Nuevo Cliente</Text>
      </TouchableOpacity>
    </View>
  </View>
</View>

          {/* Campo Fecha */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Fecha Emitida:</Text>
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
                {format(form.fechaOrden, "yyyy-MM-dd")}
              </Text>
            </TouchableOpacity>
            <DatePickerModal
              locale="es"
              mode="single"
              visible={openDate}
              onDismiss={() => setOpenDate(false)}
              date={form.fechaOrden}
              onConfirm={onConfirmDate}
              saveLabel="Guardar"
              cancelLabel="Cancelar"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Fecha de Entrega:</Text>
            <TouchableOpacity
              onPress={() => setOpenDate2(true)}
              style={styles.inputContainer}
            >
              <Feather
                name="calendar"
                size={18}
                color="#555"
                style={styles.icon}
              />
              <Text style={styles.dateText}>
                {format(form.fechaEntrega, "yyyy-MM-dd")}
              </Text>
            </TouchableOpacity>
            <DatePickerModal
              locale="es"
              mode="single"
              visible={openDate2}
              onDismiss={() => setOpenDate2(false)}
              date={form.fechaEntrega}
              onConfirm={onConfirmDate2}
              saveLabel="Guardar"
              cancelLabel="Cancelar"
            />
          </View>

          {/* Campo Tipo Examen */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Tipo de Examen:</Text>
            <View style={styles.inputContainer}>

              <Dropdown
                data={tipoexamenData}
                labelField="label"
                valueField="value"
                value={detalleTemporal.idtipoExamen}
                onChange={(item) => setDetalleTemporal(prev => ({ ...prev, idtipoExamen: item.value }))}
                placeholder="Seleccionar Examen"
                style={styles.dropdown}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                search
                searchPlaceholder="Buscar examen..."
                renderLeftIcon={() => (
                  <MaterialIcons name="medical-services" size={18} color="#555" style={styles.dropdownIcon} />
                )}
              />
            </View>
          </View>

          {/* Campo Muestra */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Tipo de Muestra:</Text>
            <View style={styles.inputContainer}>
              <Dropdown
                data={muestraData}
                labelField="label"
                valueField="value"
                value={detalleTemporal.idmuestra}
                onChange={(item) => setDetalleTemporal(prev => ({ ...prev, idmuestra: item.value }))}
                placeholder="Seleccionar Muestra"
                style={styles.dropdown}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                search
                searchPlaceholder="Buscar muestra..."
                renderLeftIcon={() => (
                  <MaterialIcons name="science" size={18} color="#555" style={styles.dropdownIcon} />
                )}
              />
            </View>
          </View>

          {/* Botón Agregar */}
          <TouchableOpacity style={styles.addButton} onPress={agregarDetalle}>
            <View style={styles.buttonContent}>
              <AntDesign name="plus" size={20} color="white" />
              <Text style={styles.buttonLabel}>Agregar</Text>
            </View>
          </TouchableOpacity>
        </View>

<ScrollView horizontal={true} style={{ flex: 1 }}>

        {/* Tabla de detalles */}
        <DataTable style={[styles.table, { minWidth: screenWidth }]}>
          <DataTable.Header style={styles.tableHeader}>
           <DataTable.Title style={styles.columnHeader}>
              <Text style={styles.headerText}>Examen</Text>
           </DataTable.Title>
            <DataTable.Title style={styles.columnHeader}>
             <Text style={styles.headerText}>Muestra</Text> 
            </DataTable.Title>
            <DataTable.Title style={styles.columnHeader}>
              <Text style={styles.headerText}>Acciones</Text>
            </DataTable.Title>
          </DataTable.Header>

          {form.detalleOrdens.map((detalle, index) => (
<DataTable.Row key={index} style={styles.tableRow}>
  <DataTable.Cell style={[styles.tableCell, styles.rowText]}>
    <Text style={styles.rowText}>{detalle.nombreExamen}</Text>
  </DataTable.Cell>
  <DataTable.Cell style={[styles.tableCell, styles.rowText]}>
   <Text style={styles.rowText}>{detalle.nombreMuestra}</Text>  
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
        </DataTable>
</ScrollView>

        {/* Botón Guardar Orden */}
        <TouchableOpacity style={styles.saveButton} onPress={guardarOrden}>
          <View style={styles.buttonContent}>
            <Feather name="save" size={20} color="white" />
            <Text style={styles.buttonLabel}>Guardar Orden</Text>
          </View>
        </TouchableOpacity>
        <CreateClientModal 
  visible={isClientModalVisible}
  onClose={() => setIsClientModalVisible(false)}
  onClientCreated={(newClient) => {
    // Actualiza la lista de clientes con el nuevo cliente
    setCliente(prev => [...prev, newClient]);
    // Selecciona automáticamente el nuevo cliente
    setForm(prev => ({ ...prev, idcliente: newClient.idcliente.toString() }));
  }}
/>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  }, clientInputContainer: {
    flexDirection: Dimensions.get('window').width > 768 ? 'row' : 'column',
    alignItems: 'center',
    gap: 10,
  },
  flexGrow: {
    flex: 1,
  },
  clientButtonWrapper: {
    width: Dimensions.get('window').width > 768 ? 'auto' : '100%',
    marginTop: Dimensions.get('window').width > 768 ? 0 : 8,
  },
  addClientButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: Dimensions.get('window').width > 768 ? 150 : '100%',
  },
  addClientButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 30,
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
  dropdownIcon: {
    marginRight: 10,
  },
  placeholderStyle: {
    color: "#bdc3c7",
    fontSize: 15,
  },
  selectedTextStyle: {
    color: "#2c3e50",
    fontSize: 15,
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
    backgroundColor: "#2c3e50", // Azul oscuro
  },
  columnHeader: {
    justifyContent: "center",
  },
  tableRow: {
    borderBottomWidth: 1,
   backgroundColor: "#ffffff", // Fondo blanco para filas
  },
  tableCell: {
    justifyContent: "center",
    paddingVertical: 12,

  },
  addButton: {
    backgroundColor: "#2196F3",
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
    backgroundColor: "#4CAF50",
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
  },headerText: {
  color: "white",
  fontWeight: "bold",
  fontSize: 14,
  textAlign: "center",
},rowText: {
  color: "#000000", // Letras negras en filas
},
});

export default withAutoRefresh(OrdenScreen);