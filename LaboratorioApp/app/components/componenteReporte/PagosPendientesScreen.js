import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DatePickerModal } from 'react-native-paper-dates';
import { format } from 'date-fns';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const ReportePagosPendientesScreen = () => {
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

  const descargarPDF = async () => {
    const fechaInicio = format(desde, 'yyyy-MM-dd');
    const fechaFin = format(hasta, 'yyyy-MM-dd');

    if (desde > hasta) {
      Alert.alert('Error', 'La fecha de inicio no puede ser mayor a la fecha final');
      return;
    }

    const baseUrl =
      Platform.OS === 'android'
        ? 'http://10.0.2.2:5090'
        : Platform.OS === 'web'
        ? 'http://127.0.0.1:5090'
        : 'http://localhost:5090';

    const url = `${baseUrl}/api/ReportePagosPendientes/PagosPendientes?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;

    try {
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
        return;
      }

      const downloadResult = await FileSystem.downloadAsync(
        url,
        FileSystem.cacheDirectory + `ReportePagosPendientes_${fechaInicio}_a_${fechaFin}.pdf`
      );

      await Sharing.shareAsync(downloadResult.uri);
    } catch (error) {
      console.error("Error al descargar el PDF:", error);
      Alert.alert("Error", "No se pudo generar el reporte.");
    }
  };

  return (
    <View style={styles.container}>
       <View style={styles.header}>
               <View style={styles.iconContainer}>
                 <Ionicons name="card-outline" size={32} color="#3b82f6" />
               </View>
               <Text style={styles.title}>Reporte de Pagos Pendientes</Text>
               <Text style={styles.subtitulo}>Genera un reporte PDF de los clientes que tienen pagos pendientes</Text>
             </View>

      <Text style={styles.label}>Desde:</Text>
      <TouchableOpacity style={styles.dateButton} onPress={() => setOpenDesde(true)}>
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
      <TouchableOpacity style={styles.dateButton} onPress={() => setOpenHasta(true)}>
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

      <TouchableOpacity style={styles.generateButton} onPress={descargarPDF}>
        <Ionicons name="download-outline" size={18} color="#fff" />
        <Text style={styles.generateText}> DESCARGAR REPORTE PDF</Text>
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
    color: '#fff',
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

export default ReportePagosPendientesScreen;
