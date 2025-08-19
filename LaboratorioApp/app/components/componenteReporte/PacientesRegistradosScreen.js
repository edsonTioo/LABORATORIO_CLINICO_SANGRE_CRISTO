import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { DatePickerModal } from 'react-native-paper-dates';
import { format } from 'date-fns';

const PacientesRegistradosScreen = () => {
  const [fechaInicio, setFechaInicio] = useState(new Date());
  const [fechaFin, setFechaFin] = useState(new Date());
  const [orden, setOrden] = useState('mayor');

  const [openDesde, setOpenDesde] = useState(false);
  const [openHasta, setOpenHasta] = useState(false);

  const baseUrl =
    Platform.OS === 'android' ? 'http://10.0.2.2:5090' : 'http://localhost:5090';

  const generarReporte = async () => {
    if (fechaInicio > fechaFin) {
      Alert.alert('Error', 'La fecha de inicio no puede ser mayor que la fecha final');
      return;
    }

    const inicio = format(fechaInicio, 'yyyy-MM-dd');
    const fin = format(fechaFin, 'yyyy-MM-dd');
    const url = `${baseUrl}/api/ReportePaciente/PacientesRegistrados?fechaInicioNacimiento=${inicio}&fechaFinNacimiento=${fin}&orden=${orden}`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('No se pudo generar el reporte');

      const blob = await response.blob();

      if (Platform.OS === 'web') {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = 'Pacientes_Registrados.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        return;
      }

      const reader = new FileReader();
      reader.onload = async () => {
        const base64data = reader.result.split(',')[1];
        const fileUri = FileSystem.documentDirectory + 'Pacientes_Registrados.pdf';

        await FileSystem.writeAsStringAsync(fileUri, base64data, {
          encoding: FileSystem.EncodingType.Base64,
        });

        await Sharing.shareAsync(fileUri);
      };

      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Error generando el reporte:', error);
      Alert.alert('Error', 'No se pudo generar el reporte');
    }
  };

  const toggleOrden = () => {
    setOrden(orden === 'mayor' ? 'menor' : 'mayor');
  };

  const onConfirmDesde = ({ date }) => {
    setFechaInicio(date);
    setOpenDesde(false);
  };

  const onConfirmHasta = ({ date }) => {
    setFechaFin(date);
    setOpenHasta(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <Ionicons name="people-outline" size={32} color="#3b82f6" />
                </View>
                <Text style={styles.title}>Reporte de Pacientes Registrados</Text>
                <Text style={styles.subtitulo}>Funciona de acuerdo a la fecha de nacimiento del paciente</Text>
              </View>

      <Text style={styles.label}>Desde:</Text>
      <TouchableOpacity style={styles.dateButton} onPress={() => setOpenDesde(true)}>
        <Ionicons name="calendar-outline" size={18} color="#fff" />
        <Text style={styles.dateText}>{format(fechaInicio, 'yyyy-MM-dd')}</Text>
      </TouchableOpacity>
      <DatePickerModal
        locale="es"
        mode="single"
        visible={openDesde}
        onDismiss={() => setOpenDesde(false)}
        date={fechaInicio}
        onConfirm={onConfirmDesde}
        saveLabel="Guardar"
        cancelLabel="Cancelar"
      />

      <Text style={styles.label}>Hasta:</Text>
      <TouchableOpacity style={styles.dateButton} onPress={() => setOpenHasta(true)}>
        <Ionicons name="calendar-outline" size={18} color="#fff" />
        <Text style={styles.dateText}>{format(fechaFin, 'yyyy-MM-dd')}</Text>
      </TouchableOpacity>
      <DatePickerModal
        locale="es"
        mode="single"
        visible={openHasta}
        onDismiss={() => setOpenHasta(false)}
        date={fechaFin}
        onConfirm={onConfirmHasta}
        saveLabel="Guardar"
        cancelLabel="Cancelar"
      />

      <Text style={styles.label}>Orden:</Text>
      <TouchableOpacity onPress={toggleOrden} style={styles.toggleButton}>
        <Text style={styles.toggleText}>
          {orden === 'mayor' ? 'De mayor a menor' : 'De menor a mayor'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={generarReporte} style={styles.generateButton}>
        <Ionicons name="document-outline" size={18} color="#fff" />
        <Text style={styles.generateText}> GENERAR REPORTE PDF</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1e293b',
  },
  subtitulo: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: '80%',
  },
  iconContainer: {
    backgroundColor: '#e0e7ff',
    padding: 16,
    borderRadius: 50,
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    color: '#1e40af',
    marginBottom: 6,
    marginTop: 12,
  },
  dateButton: {
    backgroundColor: '#3b82f6',
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateText: {
    color: 'white',
    fontWeight: 'bold',
  },
  toggleButton: {
    backgroundColor: '#cbd5e1',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  toggleText: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#1e293b',
  },
  generateButton: {
    marginTop: 24,
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  generateText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default PacientesRegistradosScreen;
