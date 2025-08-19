import React, { useState } from 'react';
import { View, Text, Platform, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';
import { DatePickerModal } from 'react-native-paper-dates';

const ReportePacientesMasExamenesScreen = () => {
  const [desde, setDesde] = useState(new Date());
  const [hasta, setHasta] = useState(new Date());
  const [openDesde, setOpenDesde] = useState(false);
  const [openHasta, setOpenHasta] = useState(false);

  const onConfirmDesde = ({ date }) => {
    setDesde(date);
    setOpenDesde(false);
  };

  const onConfirmHasta = ({ date }) => {
    setHasta(date);
    setOpenHasta(false);
  };

  const handleGenerarReporte = async () => {
    const fechaInicio = format(desde, 'yyyy-MM-dd');
    const fechaFin = format(hasta, 'yyyy-MM-dd');

    if (desde > hasta) {
      Alert.alert('Error', 'La fecha de inicio no puede ser mayor a la fecha final');
      return;
    }

    const baseUrl = Platform.OS === 'android'
      ? 'http://10.0.2.2:5090'
      : 'http://localhost:5090';

    const url = `${baseUrl}/api/ReportePacienteMasFacturas/PacienteConMasExamenes?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Error al generar el reporte');

      const blob = await response.blob();

      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `PacienteMasExamenes_${fechaInicio}_a_${fechaFin}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64 = reader.result.split(',')[1];
          const fileUri = FileSystem.documentDirectory + `PacienteMasExamenes_${fechaInicio}_a_${fechaFin}.pdf`;
          await FileSystem.writeAsStringAsync(fileUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          await Sharing.shareAsync(fileUri);
        };
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Hubo un problema al generar el reporte.');
    }
  };

  return (
    <View style={styles.container}>
     <View style={styles.header}>
               <View style={styles.iconContainer}>
                 <Ionicons name="file-tray-full-outline" size={32} color="#3b82f6" />
               </View>
               <Text style={styles.title}>Reporte de Pacientes con mas examenes</Text>
               <Text style={styles.subtitulo}>Genera un reporte PDF con pacientes con mas examenes registrados</Text>
             </View>

      <Text style={styles.label}>Desde:</Text>
      <TouchableOpacity onPress={() => setOpenDesde(true)} style={styles.dateButton}>
        <Ionicons name="calendar-outline" size={18} color="#fff" />
        <Text style={styles.dateText}>{format(desde, 'yyyy-MM-dd')}</Text>
      </TouchableOpacity>
      <DatePickerModal
        locale="es"
        mode="single"
        visible={openDesde}
        onDismiss={() => setOpenDesde(false)}
        date={desde}
        onConfirm={onConfirmDesde}
        saveLabel="Guardar"
        cancelLabel="Cancelar"
      />

      <Text style={styles.label}>Hasta:</Text>
      <TouchableOpacity onPress={() => setOpenHasta(true)} style={styles.dateButton}>
        <Ionicons name="calendar-outline" size={18} color="#fff" />
        <Text style={styles.dateText}>{format(hasta, 'yyyy-MM-dd')}</Text>
      </TouchableOpacity>
      <DatePickerModal
        locale="es"
        mode="single"
        visible={openHasta}
        onDismiss={() => setOpenHasta(false)}
        date={hasta}
        onConfirm={onConfirmHasta}
        saveLabel="Guardar"
        cancelLabel="Cancelar"
      />

      <TouchableOpacity style={styles.generateButton} onPress={handleGenerarReporte}>
        <Ionicons name="document-outline" size={18} color="white" />
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
    marginBottom: 32,
  },
  iconContainer: {
    backgroundColor: '#e0e7ff',
    padding: 16,
    borderRadius: 50,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 24,
  },
  subtitulo: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: '80%',
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

export default ReportePacientesMasExamenesScreen;
