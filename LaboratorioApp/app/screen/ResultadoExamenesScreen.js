import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Linking, Platform, TextInput } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { AntDesign, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import withAutoRefresh from './withAutoRefresh';
// Configuración de API
const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5090/api/ImprimirResultados' : 'http://localhost:5090/api/ImprimirResultados';
const API_CARGAR_PACIENTES = Platform.OS === 'android' ? 'http://10.0.2.2:5090/api/Paciente' : 'http://localhost:5090/api/Paciente';

const ResultadoExamenesScreen = () => {
  const [pacientes, setPacientes] = useState([]);
  const [filteredPacientes, setFilteredPacientes] = useState([]);
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  const [examenes, setExamenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFocus, setIsFocus] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const cargarPacientes = async () => {
      setLoading(true);
      try {
        const response = await fetch(API_CARGAR_PACIENTES);
        const data = await response.json();

        const pacientesData = data.$values || data;

        const pacientesFormateados = pacientesData.map(paciente => ({
          Idcliente: paciente.idcliente || paciente.IDCliente,
          Nombre: paciente.nombre || paciente.Nombre,
          Cedula: paciente.cedula || paciente.Cedula,
          Genero: paciente.genero || paciente.Genero,
          OrdenesCount: paciente.ordens?.$values?.length || paciente.Ordens?.length || 0
        }));

        setPacientes(pacientesFormateados);
        setFilteredPacientes(pacientesFormateados);
      } catch (error) {
        console.error('Error al cargar pacientes:', error);
      } finally {
        setLoading(false);
      }
    };

    cargarPacientes();
  }, []);

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text.length === 0) {
      setFilteredPacientes(pacientes);
      return;
    }
    const filtered = pacientes.filter(paciente =>
      paciente.Nombre.toLowerCase().includes(text.toLowerCase()) ||
      paciente.Cedula.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredPacientes(filtered);
  };

  const obtenerExamenes = async (idCliente) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/examenes-paciente/${idCliente}`);
      const data = await response.json();

      const examenesData = data.$values || data;

      if (Array.isArray(examenesData)) {
        setExamenes(examenesData);
      } else {
        console.warn('La respuesta no es un array:', examenesData);
        setExamenes([]);
      }
    } catch (error) {
      console.error('Error al obtener exámenes:', error);
      setExamenes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPaciente = (item) => {
    setSelectedPaciente(item);
    setIsFocus(false);
    obtenerExamenes(item.Idcliente);
  };

  const handleOpenPDF = async (id) => {
    try {
      const pdfUrl = `${API_URL}/generar-reporte/${id}`;
      const supported = await Linking.canOpenURL(pdfUrl);

      if (supported) {
        await Linking.openURL(pdfUrl);
      } else {
        alert('No se puede abrir el PDF. Asegúrate de tener un navegador instalado.');
      }
    } catch (error) {
      console.error('Error al abrir PDF:', error);
      alert('Ocurrió un error al abrir el PDF');
    }
  };

  const getEstadoColor = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'completado':
        return '#2ecc71';
      case 'pendiente':
        return '#f39c12';
      case 'cancelado':
        return '#e74c3c';
      default:
        return '#3498db';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Laboratorio Clínico</Text>
        <Text style={styles.headerSubtext}>Imprimir Resultados</Text>
      </View>


      <View style={styles.contentContainer}>

        <Dropdown
          style={[styles.dropdown, isFocus && { borderColor: '#3498db' }]}
          placeholderStyle={styles.placeholderStyle}
          selectedTextStyle={styles.selectedTextStyle}
          inputSearchStyle={styles.inputSearchStyle}
          iconStyle={styles.iconStyle}
          data={filteredPacientes}
          search
          maxHeight={300}
          labelField="Nombre"
          valueField="Idcliente"
          placeholder={!isFocus ? 'Seleccionar paciente...' : '...'}
          searchPlaceholder="Buscar..."
          value={selectedPaciente}
          onFocus={() => setIsFocus(true)}
          onBlur={() => setIsFocus(false)}
          onChange={handleSelectPaciente}
          renderLeftIcon={() => (
            <MaterialIcons
              style={styles.dropdownIcon}
              name="person-search"
              size={20}
              color={isFocus ? '#3498db' : '#7f8c8d'}
            />
          )}
          renderItem={(item, index) => (
            <Animatable.View
              animation="fadeIn"
              duration={500}
              delay={index * 50}
              style={styles.item}
            >
              <Text style={styles.textItem}>{item.Nombre}</Text>
              <View style={styles.itemDetails}>
                <Text style={styles.subTextItem}>
                  <MaterialIcons name="fingerprint" size={14} color="#7f8c8d" /> {item.Cedula}
                </Text>
                <Text style={styles.subTextItem}>
                  <FontAwesome name="flask" size={14} color="#7f8c8d" /> {item.OrdenesCount} exámenes
                </Text>
              </View>
            </Animatable.View>
          )}
        />

        {selectedPaciente && (
          <Animatable.View
            animation="fadeIn"
            duration={600}
            style={styles.pacienteSeleccionadoContainer}
          >
            <View style={styles.pacienteHeader}>
              <MaterialIcons name="person" size={24} color="#3498db" />
              <Text style={styles.pacienteSeleccionadoNombre}>
                {selectedPaciente.Nombre}
              </Text>
            </View>
            <View style={styles.pacienteDetails}>
              <Text style={styles.pacienteSeleccionadoInfo}>
                <MaterialIcons name="credit-card" size={14} color="#7f8c8d" /> {selectedPaciente.Cedula}
              </Text>
              <Text style={styles.pacienteSeleccionadoInfo}>
                <MaterialIcons name="wc" size={14} color="#7f8c8d" /> {selectedPaciente.Genero}
              </Text>
            </View>
          </Animatable.View>
        )}

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#3498db" />
            <Text style={styles.loadingText}>Cargando información...</Text>
          </View>
        ) : (
          <ScrollView style={styles.examenesContainer} showsVerticalScrollIndicator={false}>
            {examenes.length > 0 ? (
              examenes.map((examen, index) => {
                const id = examen.iddetalleOrden || examen.IddetalleOrden || examen.id;
                const nombre = examen.nombreExamen || examen.NombreExamen || 'Examen sin nombre';
                const descripcion = examen.descripcion || examen.Descripcion;
                const fecha = examen.fechaOrden || examen.FechaOrden;
                const estado = examen.estado || examen.Estado;

                return (
                  <Animatable.View
                    key={id}
                    animation="fadeInUp"
                    duration={600}
                    delay={index * 100}
                    style={styles.examenCard}
                  >
                    <View style={styles.examenHeader}>
                      <FontAwesome name="flask" size={18} color="#3498db" />
                      <Text style={styles.examenNombre}>{nombre}</Text>
                    </View>

                    {descripcion && (
                      <Text style={styles.examenDescripcion}>{descripcion}</Text>
                    )}

                    <View style={styles.examenInfoRow}>
                      <View style={styles.examenInfoContainer}>
                        <MaterialIcons name="date-range" size={16} color="#7f8c8d" />
                        <Text style={styles.examenInfo}>
                          {fecha ? new Date(fecha).toLocaleDateString() : 'No disponible'}
                        </Text>
                      </View>
                      <View style={[styles.estadoContainer, { backgroundColor: getEstadoColor(estado) + '20' }]}>
                        <View style={[styles.estadoDot, { backgroundColor: getEstadoColor(estado) }]} />
                        <Text style={[styles.examenEstado, { color: getEstadoColor(estado) }]}>
                          {estado || 'Desconocido'}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.pdfButton}
                      onPress={() => handleOpenPDF(id)}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="picture-as-pdf" size={20} color="white" />
                      <Text style={styles.pdfButtonText}>Ver Resultado PDF</Text>
                    </TouchableOpacity>
                  </Animatable.View>
                );
              })
            ) : (
              <Animatable.View
                animation="fadeIn"
                duration={600}
                style={styles.noResultsContainer}
              >
                <MaterialIcons name="find-in-page" size={50} color="#bdc3c7" />
                <Text style={styles.noExamenesText}>
                  {selectedPaciente ? 'No se encontraron exámenes' : 'Seleccione un paciente'}
                </Text>
                <Text style={styles.noExamenesSubText}>
                  {selectedPaciente ? `Para ${selectedPaciente.Nombre}` : 'Para ver los resultados disponibles'}
                </Text>
              </Animatable.View>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa"
  },  header: {
    backgroundColor: '#2c3e50',
    padding: 25,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  headerText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  headerSubtext: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    marginTop: 5,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
    marginTop: 10
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginHorizontal: 30
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIconContainer: {
    marginRight: 10
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#2c3e50'
  },
  dropdown: {
   height: 50,
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  placeholderStyle: {
    fontSize: 16,
    color: '#95a5a6',
  },
  selectedTextStyle: {
    fontSize: 16,
    color: '#2c3e50',
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
    color: '#2c3e50',
    borderBottomColor: '#eee',
    borderBottomWidth: 1
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  dropdownIcon: {
    marginRight: 10,
  },
  item: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  textItem: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 5,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  subTextItem: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  pacienteSeleccionadoContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  pacienteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  pacienteDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  pacienteSeleccionadoNombre: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 10
  },
  pacienteSeleccionadoInfo: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  examenesContainer: {
    flex: 1,
  },
  containers: {
    padding: 20,
  },
  examenCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  examenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  examenNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 10,
    flex: 1
  },
  examenDescripcion: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 15,
    lineHeight: 20
  },
  examenInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    alignItems: 'center'
  },
  examenInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  examenInfo: {
    fontSize: 13,
    color: '#7f8c8d',
    marginLeft: 5
  },
  estadoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20
  },
  estadoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5
  },
  examenEstado: {
    fontSize: 12,
    fontWeight: '600',
  },
  pdfButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 5
  },
  pdfButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    color: '#7f8c8d'
  },
  noResultsContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'white',
    borderRadius: 10,
    marginTop: 20
  },
  noExamenesText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 15,
    fontWeight: '500'
  },
  noExamenesSubText: {
    fontSize: 14,
    color: '#bdc3c7',
    textAlign: 'center',
    marginTop: 5
  },
});

export default withAutoRefresh(ResultadoExamenesScreen);
