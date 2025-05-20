import React, { useState } from 'react';
import { View, Text, Platform, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';
import { DatePickerModal } from 'react-native-paper-dates';


const ExamenesMasSolicitadosScreen = () => {
  const [desde, setDesde] = useState(new Date());
  const [hasta, setHasta] = useState(new Date());
  const [openDesde, setOpenDesde] = useState(false);
  const [openHasta, setOpenHasta] = useState(false);
  const [top, setTop] = useState(5);

  const onConfirmDesde = ({ date }) => {
    setDesde(date);
    setOpenDesde(false);
  };

  const onConfirmHasta = ({ date }) => {
    setHasta(date);
    setOpenHasta(false);
  };

  const generarReporte = async () => {
    const fechaInicio = format(desde, "yyyy-MM-dd");
    const fechaFin = format(hasta, "yyyy-MM-dd");

    if (desde > hasta) {
      Alert.alert('Error', 'La fecha de inicio no puede ser mayor a la fecha final');
      return;
    }

    const baseUrl = Platform.OS === 'android'
      ? 'http://10.0.2.2:5090'
      : 'http://localhost:5090';

    const url = `${baseUrl}/api/TopExamenes/top-examenes-pdf?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&top=${top}`;

    try {
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
        return;
      }

      const downloadResult = await FileSystem.downloadAsync(
        url,
        FileSystem.cacheDirectory + `TopExamenes_${fechaInicio}_${fechaFin}.pdf`
      );

      await Sharing.shareAsync(downloadResult.uri);
    } catch (error) {
      console.error('Error al generar el reporte:', error);
      Alert.alert('Error', 'Hubo un problema al generar el reporte.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="analytics-outline" size={24} color="#3b82f6" />
        </View>
        <Text style={styles.title}>Top de Exámenes Solicitados</Text>
        <Text style={styles.subtitulo}>Genera un reporte PDF con los examenes más solicitados por clientes</Text>
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

      <Text style={styles.label}>Cantidad a mostrar:</Text>
      <View style={styles.topOptions}>
        {[5, 10, 15].map((num) => (
          <TouchableOpacity
            key={num}
            style={[styles.topButton, top === num && styles.selectedTopButton]}
            onPress={() => setTop(num)}
          >
            <Text style={styles.topButtonText}>{num}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.generateButton} onPress={generarReporte}>
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
    marginBottom: 22,
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
  topOptions: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 12,
  },
  topButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#cbd5e1',
    borderRadius: 8,
  },
  selectedTopButton: {
    backgroundColor: '#2563eb',
  },
  topButtonText: {
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

export default ExamenesMasSolicitadosScreen;
