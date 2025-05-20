import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Alert } from 'react-native';
import { DatePickerModal } from 'react-native-paper-dates';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';

const GananciasExamenScreen = () => {
  const [fechaInicio, setFechaInicio] = useState(new Date());
  const [fechaFin, setFechaFin] = useState(new Date());
  const [showInicio, setShowInicio] = useState(false);
  const [showFin, setShowFin] = useState(false);

  const onChangeInicio = ({ date }) => {
    if (date) {
      setFechaInicio(date);
    }
    setShowInicio(false);
  };

  const onChangeFin = ({ date }) => {
    if (date) {
      setFechaFin(date);
    }
    setShowFin(false);
  };

  const baseUrl =
    Platform.OS === 'android' ? 'http://10.0.2.2:5090' : 'http://localhost:5090';

  const generarReporte = async () => {
    if (fechaInicio > fechaFin) {
      Alert.alert('Error', 'La fecha de inicio no puede ser mayor que la fecha final');
      return;
    }

    const inicio = format(fechaInicio, 'yyyy-MM-dd');
    const fin = format(fechaFin, 'yyyy-MM-dd');
    const url = `${baseUrl}/api/ReporteGananciasExamen/reporte-ingresos?fechaInicio=${inicio}&fechaFin=${fin}`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('No se pudo generar el reporte');
      const blob = await response.blob();

      if (Platform.OS === 'web') {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `Ganancias_${inicio}_a_${fin}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        return;
      }

      const reader = new FileReader();
      reader.onload = async () => {
        const base64data = reader.result.split(',')[1];
        const fileUri = FileSystem.documentDirectory + `Ganancias_${inicio}_a_${fin}.pdf`;
        await FileSystem.writeAsStringAsync(fileUri, base64data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await Sharing.shareAsync(fileUri);
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Error generando el reporte:', error);
      Alert.alert('Error', 'Hubo un problema al generar el reporte.');
    }
  };

  return (
    <View style={styles.container}>
       <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <Ionicons name="bar-chart-outline" size={32} color="#3b82f6" />
                </View>
                <Text style={styles.title}>Reporte de Ganancias por Examen</Text>
                <Text style={styles.subtitulo}>Genera un reporte PDF de ganancias generadas por tipo de examen</Text>
              </View>

      {/* Fecha Inicio */}
      <Text style={styles.label}>Desde:</Text>
      <TouchableOpacity onPress={() => setShowInicio(true)} style={styles.dateButton}>
        <Ionicons name="calendar-outline" size={18} color="#fff" />
        <Text style={styles.dateText}>{format(fechaInicio, 'yyyy-MM-dd')}</Text>
      </TouchableOpacity>
      <DatePickerModal
        locale="es"
        mode="single"
        visible={showInicio}
        date={fechaInicio}
        onDismiss={() => setShowInicio(false)}
        onConfirm={onChangeInicio}
        saveLabel="Guardar"
        cancelLabel="Cancelar"
      />

      {/* Fecha Fin */}
      <Text style={styles.label}>Hasta:</Text>
      <TouchableOpacity onPress={() => setShowFin(true)} style={styles.dateButton}>
        <Ionicons name="calendar-outline" size={18} color="#fff" />
        <Text style={styles.dateText}>{format(fechaFin, 'yyyy-MM-dd')}</Text>
      </TouchableOpacity>
      <DatePickerModal
        locale="es"
        mode="single"
        visible={showFin}
        date={fechaFin}
        onDismiss={() => setShowFin(false)}
        onConfirm={onChangeFin}
        saveLabel="Guardar"
        cancelLabel="Cancelar"
      />

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
    marginBottom: 32,
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

export default GananciasExamenScreen;
