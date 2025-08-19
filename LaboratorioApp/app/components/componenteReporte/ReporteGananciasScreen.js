import React, { useState } from 'react';
import { View, Text, Platform, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { format } from "date-fns";
import { DatePickerModal } from "react-native-paper-dates";

const ReporteGananciasScreen = () => {
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
    try {
      const fechaInicio = format(desde, "yyyy-MM-dd");
      const fechaFin = format(hasta, "yyyy-MM-dd");

      const baseUrl =
        Platform.OS === 'android'
          ? 'http://10.0.2.2:5090'
          : 'http://localhost:5090';

      const url = `${baseUrl}/api/ReporteGanancias/generar?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Error al generar el reporte');

      const blob = await response.blob();

      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `ReporteGanancias_${fechaInicio}_a_${fechaFin}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64 = reader.result.split(',')[1];
          const fileUri = FileSystem.documentDirectory + `ReporteGanancias_${fechaInicio}_a_${fechaFin}.pdf`;
          await FileSystem.writeAsStringAsync(fileUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          await Sharing.shareAsync(fileUri);
        };
      }
    } catch (error) {
      console.error("Error al descargar el PDF:", error);
      Alert.alert("Error", "No se pudo generar el reporte.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="cash-outline" size={32} color="#3b82f6" />
          </View>
          <Text style={styles.title}>Reporte de Ganancias</Text>
          <Text style={styles.subtitulo}>Genera un reporte PDF de ganancias generales del negocio</Text>
        </View>

      {/* Campo Desde */}
      <Text style={styles.label}>Desde:</Text>
      <TouchableOpacity onPress={() => setOpenDesde(true)} style={styles.dateButton}>
        <Feather name="calendar" size={18} color="#fff" style={styles.icon} />
        <Text style={styles.dateText}>{format(desde, "yyyy-MM-dd")}</Text>
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

      {/* Campo Hasta */}
      <Text style={styles.label}>Hasta:</Text>
      <TouchableOpacity onPress={() => setOpenHasta(true)} style={styles.dateButton}>
        <Feather name="calendar" size={18} color="#fff" style={styles.icon} />
        <Text style={styles.dateText}>{format(hasta, "yyyy-MM-dd")}</Text>
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
    marginBottom: 30,
    textAlign: 'center',
    color: '#1e293b',
  },
  subtitulo: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: '80%',
    marginLeft:100,
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
    alignItems: 'center',
    marginBottom: 8,
    flexDirection: 'row',
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
  icon: {
    marginRight: 8,
  },
});

export default ReporteGananciasScreen;
