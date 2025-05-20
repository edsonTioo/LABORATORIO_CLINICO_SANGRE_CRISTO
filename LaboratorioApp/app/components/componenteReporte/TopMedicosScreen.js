import React, { useState, useEffect } from 'react';
import { View, Text, Platform, StyleSheet, Pressable, Alert, ScrollView, ActivityIndicator, Modal, TouchableOpacity } from 'react-native';
import { DatePickerModal } from 'react-native-paper-dates';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const baseUrl = Platform.OS === 'android' ? 'http://10.0.2.2:5090' : 'http://localhost:5090';

// Componente CustomScrollView para manejar el scroll en web
const CustomScrollView = ({ children }) => {
  if (Platform.OS === 'web') {
    return (
      <div style={webStyles.scrollContainer}>
        <div style={webStyles.contentContainer}>
          {children}
        </div>
      </div>
    );
  }
  
  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContainer}
      showsVerticalScrollIndicator={true}
    >
      {children}
    </ScrollView>
  );
};

const TopMedicosScreen = () => {
  // Estados para las fechas
  const [fechaInicio, setFechaInicio] = useState(new Date());
  const [fechaFin, setFechaFin] = useState(new Date());
  const [openInicio, setOpenInicio] = useState(false);
  const [openFin, setOpenFin] = useState(false);
  // Estados para los datos
  const [tiposExamen, setTiposExamen] = useState([]);
  const [idTipoExamenSeleccionado, setIdTipoExamenSeleccionado] = useState(null);
  const [topSeleccionado, setTopSeleccionado] = useState(10);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  
  // Estados para los dropdowns
  const [showExamenDropdown, setShowExamenDropdown] = useState(false);
  const [showTopDropdown, setShowTopDropdown] = useState(false);

  // Obtener tipos de examen al cargar el componente
  useEffect(() => {
    const obtenerTiposExamen = async () => {
      try {
        setError(null);
        setCargando(true);
        const response = await fetch(`${baseUrl}/api/TipoExamen`);
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Datos recibidos:', data);
        
        // Ajusta según la estructura de tu API
        setTiposExamen(data.$values || data || []);
      } catch (error) {
        console.error('Error al obtener tipos de examen:', error);
        setError('No se pudieron cargar los tipos de examen. Verifica la conexión.');
      } finally {
        setCargando(false);
      }
    };

    obtenerTiposExamen();
  }, []);

 // Manejar cambios en los selectores de fecha
 const onConfirmInicio = ({ date }) => {
  setFechaInicio(date);
  setOpenInicio(false);
};
const onConfirmFin = ({ date }) => {
  setFechaFin(date);
  setOpenFin(false);
};


  // Seleccionar examen con dropdown
  const seleccionarExamen = (id) => {
    setIdTipoExamenSeleccionado(id);
    setShowExamenDropdown(false);
  };

  // Seleccionar top con dropdown
  const seleccionarTop = (numero) => {
    setTopSeleccionado(numero);
    setShowTopDropdown(false);
  };

  // Generar el reporte PDF
  const generarReporte = async () => {
    if (!idTipoExamenSeleccionado) {
      Alert.alert('Error', 'Debes seleccionar un tipo de examen');
      return;
    }

    if (fechaInicio > fechaFin) {
      Alert.alert('Error', 'La fecha de inicio no puede ser mayor a la fecha final');
      return;
    }

    setCargando(true);

    try {
      const fechaInicioStr = fechaInicio.toISOString().split('T')[0];
      const fechaFinStr = fechaFin.toISOString().split('T')[0];

      const url = `${baseUrl}/api/ReportesMedicos/top-medicos-pdf?fechaInicio=${fechaInicioStr}&fechaFin=${fechaFinStr}&top=${topSeleccionado}&idTipoExamen=${idTipoExamenSeleccionado}`;

      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        const downloadResumable = FileSystem.createDownloadResumable(
          url,
          FileSystem.documentDirectory + `TopMedicos_${fechaInicioStr}_a_${fechaFinStr}.pdf`,
          {}
        );

        const { uri } = await downloadResumable.downloadAsync();
        await Sharing.shareAsync(uri);
      }
    } catch (error) {
      console.error("Error al generar el reporte:", error);
      Alert.alert('Error', 'No se pudo generar el reporte. Por favor intenta nuevamente.');
    } finally {
      setCargando(false);
    }
  };

  // Formatear fecha para mostrar
  const formatDate = (date) => {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <View style={styles.container}>
      <CustomScrollView>
        {/* Encabezado */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="medkit-outline" size={32} color="#3b82f6" />
          </View>
          <Text style={styles.titulo}>Reporte de Top Médicos</Text>
          <Text style={styles.subtitulo}>Genera un reporte PDF con los médicos más activos según tipo de examen</Text>
        </View>


      {/* Mensaje de error si falla la carga */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={20} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

          {/* Selector de rango de fechas */}
          <View style={styles.card}>
        <Text style={styles.cardTitle}>Rango de Fechas</Text>
        
        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={styles.label}>Fecha Inicio</Text>
            <Pressable 
              style={({ pressed }) => [
                styles.dateButton,
                pressed && styles.buttonPressed
              ]}
              onPress={() => setOpenInicio(true)}
              android_ripple={{ color: '#f1f5f9' }}
            >
              <Ionicons name="calendar" size={20} color="#3b82f6" />
              <Text style={styles.dateText}>{formatDate(fechaInicio)}</Text>
            </Pressable>
            <DatePickerModal
              locale="es"
              mode="single"
              visible={openInicio}
              onDismiss={() => setOpenInicio(false)}
              date={fechaInicio}
              onConfirm={onConfirmInicio}
              saveLabel="Guardar"
              cancelLabel="Cancelar"
            />
          </View>

          <View style={styles.column}>
            <Text style={styles.label}>Fecha Fin</Text>
            <Pressable 
              style={({ pressed }) => [
                styles.dateButton,
                pressed && styles.buttonPressed
              ]}
              onPress={() => setOpenFin(true)}
              android_ripple={{ color: '#f1f5f9' }}
            >
              <Ionicons name="calendar" size={20} color="#3b82f6" />
              <Text style={styles.dateText}>{formatDate(fechaFin)}</Text>
            </Pressable>
            <DatePickerModal
              locale="es"
              mode="single"
              visible={openFin}
              onDismiss={() => setOpenFin(false)}
              date={fechaFin}
              onConfirm={onConfirmFin}
              saveLabel="Guardar"
              cancelLabel="Cancelar"
            />
          </View>
        </View>
      </View>

      {/* Selector de tipo de examen */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tipo de Examen</Text>
        <Pressable 
          style={({ pressed }) => [
            styles.selectButton,
            pressed && styles.buttonPressed,
            tiposExamen.length === 0 && styles.disabledButton
          ]}
          onPress={() => tiposExamen.length > 0 && setShowExamenDropdown(true)}
          disabled={tiposExamen.length === 0}
        >
          <Text style={[
            styles.selectButtonText,
            !idTipoExamenSeleccionado && styles.placeholderText,
            tiposExamen.length === 0 && styles.disabledText
          ]}>
            {idTipoExamenSeleccionado 
              ? tiposExamen.find(e => e.idtipoExamen === idTipoExamenSeleccionado)?.nombreExamen 
              : tiposExamen.length > 0 ? 'Seleccione un tipo de examen' : 'Cargando exámenes...'}
          </Text>
          <Ionicons 
            name="chevron-down" 
            size={20} 
            color={tiposExamen.length === 0 ? '#cbd5e1' : '#64748b'} 
          />
        </Pressable>

        {/* Dropdown para tipos de examen */}
        <Modal
          visible={showExamenDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowExamenDropdown(false)}
        >
          <TouchableOpacity 
            style={styles.dropdownOverlay}
            activeOpacity={1}
            onPress={() => setShowExamenDropdown(false)}
          >
            <View style={styles.dropdownContainer}>
              <ScrollView>
                {tiposExamen.map((examen) => (
                  <TouchableOpacity
                    key={examen.idtipoExamen}
                    style={styles.dropdownItem}
                    onPress={() => seleccionarExamen(examen.idtipoExamen)}
                  >
                    <Text style={styles.dropdownItemText}>{examen.nombreExamen}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {tiposExamen.length === 0 && !error && (
          <ActivityIndicator size="small" color="#3b82f6" style={styles.loadingIndicator} />
        )}
      </View>

      {/* Selector de top médicos */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cantidad de Médicos</Text>
        <Pressable 
          style={({ pressed }) => [
            styles.selectButton,
            pressed && styles.buttonPressed
          ]}
          onPress={() => setShowTopDropdown(true)}
          android_ripple={{ color: '#f1f5f9' }}
        >
          <Text style={styles.selectButtonText}>Top {topSeleccionado}</Text>
          <Ionicons name="chevron-down" size={20} color="#64748b" />
        </Pressable>

        {/* Dropdown para top médicos */}
        <Modal
          visible={showTopDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowTopDropdown(false)}
        >
          <TouchableOpacity 
            style={styles.dropdownOverlay}
            activeOpacity={1}
            onPress={() => setShowTopDropdown(false)}
          >
            <View style={[styles.dropdownContainer, { maxHeight: 200 }]}>
              {[5, 10, 15].map((numero) => (
                <TouchableOpacity
                  key={numero}
                  style={styles.dropdownItem}
                  onPress={() => seleccionarTop(numero)}
                >
                  <Text style={styles.dropdownItemText}>Top {numero}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>

      {/* Botón para generar reporte */}
      <View style={styles.buttonContainer}>
    <Pressable 
      style={({ pressed }) => [
        styles.generateButton,
        pressed && styles.buttonPressed
      ]}
      onPress={generarReporte}
    >
      {cargando ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.generateButtonText}>Generar Reporte</Text>
      )}
    </Pressable>
  </View>

      {/* Información adicional */}
      <View style={styles.infoContainer}>
          <Ionicons name="information-circle-outline" size={20} color="#64748b" />
          <Text style={styles.infoText}>
            El reporte mostrará los {topSeleccionado} médicos con más exámenes realizados 
            del tipo seleccionado en el rango de fechas especificado.
          </Text>
        </View>
     {/* Espacio adicional para forzar scroll en web */}
     {Platform.OS === 'web' && <View style={{ height: 50 }} />}
      </CustomScrollView>
    </View>
  );
};

// Estilos específicos para web
const webStyles = {
  scrollContainer: {
    width: '100%',
    height: '100vh',
    overflowY: 'auto',
    scrollbarWidth: 'thin',
    scrollbarColor: '#3b82f6 #f8fafc',
    position: 'relative',
    '&::-webkit-scrollbar': {
      width: '10px',
    },
    '&::-webkit-scrollbar-track': {
      background: '#f1f5f9',
      borderRadius: '10px',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: '#3b82f6',
      borderRadius: '10px',
      border: '2px solid #f1f5f9',
    },
  },
  contentContainer: {
    minHeight: 'calc(100vh + 1px)',
    padding: '20px',
    paddingBottom: '60px',
    boxSizing: 'border-box',
  }
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    backgroundColor: '#e0e7ff',
    padding: 16,
    borderRadius: 50,
    marginBottom: 12,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  
  subtitulo: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: '80%',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  errorText: {
    color: '#ef4444',
    marginLeft: 8,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dateText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#1e293b',
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  selectButtonText: {
    fontSize: 16,
    color: '#1e293b',
  },
  placeholderText: {
    color: '#94a3b8',
  },
  disabledButton: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  disabledText: {
    color: '#cbd5e1',
  },
  loadingIndicator: {
    marginTop: 16,
  },
  buttonPressed: {
    backgroundColor: '#f1f5f9',
  },
  generateButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  webInput: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: 'white',
    width: '100%',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  infoText: {
    color: '#64748b',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
    width: '80%',
    maxHeight: '50%',
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#1e293b',
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  generateButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 10,
    elevation: 2,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonPressed: {
    opacity: 0.85,
  },

});

export default TopMedicosScreen;