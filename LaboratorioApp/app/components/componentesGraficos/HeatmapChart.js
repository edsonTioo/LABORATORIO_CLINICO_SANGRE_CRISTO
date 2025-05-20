import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Calendar, CalendarUtils } from 'react-native-calendars';
import { Platform } from 'react-native';

const HeatmapChart = () => {
  const [heatmapData, setHeatmapData] = useState({});
  const [loading, setLoading] = useState(true);

  const baseURL = Platform.OS === 'android' 
      ? 'http://10.0.2.2:5090' 
      : 'http://localhost:5090';

  useEffect(() => {
    fetchHeatmapData();
  }, []);

  const fetchHeatmapData = async () => {
    try {
      // Obtener la fecha actual en formato ISO
      const currentDate = new Date().toISOString();  // Ejemplo: '2025-05-13T00:00:00.000Z'

      // Hacer la petición incluyendo la fecha actual como parámetro 'endDate'
      const response = await fetch(`${baseURL}/api/Heatmap/OrdenesPorFecha?endDate=${currentDate}`);
       const rawData = await response.json();

    const data = rawData["$values"];  // Extraer el array real

    const formattedData = formatDataForHeatmap(data);
    setHeatmapData(formattedData);
    setLoading(false);
    } catch (error) {
      console.error('Error fetching heatmap data:', error);
      setLoading(false);
    }
  };

  const formatDataForHeatmap = (data) => {
    const markedDates = {};

    data.forEach(item => {
      const dateStr = CalendarUtils.getCalendarDateString(new Date(item.date));

      let color = '';
      if (item.count === 0) {
        color = '#ebedf0'; // Ninguna actividad
      } else if (item.count <= 3) {
        color = '#9be9a8'; // Actividad baja    
      } else if (item.count <= 6) {
        color = '#40c463'; // Actividad media
      } else if (item.count <= 9) {
        color = '#30a14e'; // Actividad alta
      } else {
        color = '#216e39'; // Actividad muy alta
      }

     markedDates[dateStr] = {
  customStyles: {
    container: {
      backgroundColor: color,
      borderRadius: 5, // puedes ajustar este valor para suavizar las esquinas
    },
    text: {
      color: '#fff',
      fontWeight: 'bold',
    },
  }
};

    });

    return markedDates;
  };

  if (loading) {
    return <Text style={styles.loadingText}>Cargando datos...</Text>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Actividad de Órdenes</Text>
      <Calendar
        markingType={'custom'}
        markedDates={heatmapData}
        theme={{
          calendarBackground: '#ffffff',
          textSectionTitleColor: '#b6c1cd',
          dayTextColor: '#2d4150',
          todayTextColor: '#00adf5',
          selectedDayTextColor: '#ffffff',
          monthTextColor: '#2d4150',
          arrowColor: '#2d4150',
        }}
        style={styles.calendar}
      />
      <View style={styles.legendContainer}>
        <Text style={styles.legendText}>Menos</Text>
        <View style={styles.colorLegend}>
          <View style={[styles.colorBox, { backgroundColor: '#ebedf0' }]} />
          <View style={[styles.colorBox, { backgroundColor: '#9be9a8' }]} />
          <View style={[styles.colorBox, { backgroundColor: '#40c463' }]} />
          <View style={[styles.colorBox, { backgroundColor: '#30a14e' }]} />
          <View style={[styles.colorBox, { backgroundColor: '#216e39' }]} />
        </View>
        <Text style={styles.legendText}>Más</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
  },
  calendar: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  legendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 10,
  },
  legendText: {
    fontSize: 14,
    color: '#555',
  },
  colorLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 120,
  },
  colorBox: {
    width: 15,
    height: 15,
    borderRadius: 3,
  },
});

export default HeatmapChart;
