import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Platform, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Dropdown } from 'react-native-element-dropdown';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

const CreateParametroScreen = () => {
  const navigation = useNavigation();
  
  // Estado del formulario
  const [form, setForm] = useState({
    idtipoExamen: null,
    nombreParametro: '',
    unidadMedida: '',
    valorReferencia: '',
    OpcionesFijas :''
  });

// Nuevo estado para manejar subtítulos
const [subtitulosDisponibles, setSubtitulosDisponibles] = useState([]);
  // Estados para el dropdown y carga
  const [tiposExamen, setTiposExamen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFocus, setIsFocus] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // URLs de la API
  const API_URL_PARAMETRO = Platform.OS === 'android' 
    ? "http://10.0.2.2:5090/api/Parametros" 
    : "http://localhost:5090/api/Parametros";
  
  const API_URL_TIPOEXAMEN = Platform.OS === "android" 
    ? "http://10.0.2.2:5090/api/TipoExamen" 
    : "http://localhost:5090/api/TipoExamen";

  // Preparamos los datos para el Dropdown
  const tipoexamenData = tiposExamen.map(tap => ({
    value: tap.idtipoExamen,
    label: tap.nombreTipoExamen || tap.nombreExamen,
  }));

  // Obtener tipos de examen al cargar
  useEffect(() => {
    const fetchTiposExamen = async () => {
      try {
        const response = await fetch(API_URL_TIPOEXAMEN);
        const data = await response.json();
        setTiposExamen(data.$values || data || []);
        setLoading(false);
      } catch (error) {
        console.error('Error:', error);
        Alert.alert('Error', 'No se pudieron cargar los tipos de examen');
        setLoading(false);
      }
    };
    fetchTiposExamen();
  }, []);
// Efecto para cargar subtítulos cuando selecciona examen
useEffect(() => {
  if (form.idtipoExamen) {
    fetch(`${API_URL_TIPOEXAMEN}/${form.idtipoExamen}`)
      .then(res => res.json())
      .then(data => {
        if (data.subtitulos) {
          const subs = data.subtitulos.split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0)
            .map(s => ({ label: s, value: s }));
          
          setSubtitulosDisponibles(subs);
        }
      });
  }
}, [form.idtipoExamen]);
  // Manejar cambios en el formulario
  const handleChange = (name, value) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Validar nombre del parámetro (solo mayúsculas, sin espacios, sin caracteres especiales)
  const handleNombreChange = (text) => {
    const cleanedText = text.replace(/[^a-zA-Z\s]/g, '');

  // Convierte a minúsculas, luego capitaliza la primera letra de cada palabra si quieres (ver segunda opción)
  const formattedText = cleanedText
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase()); // Solo la primera letra de cada palabra (tipo título)

  setForm(prev => ({ ...prev, nombreParametro: formattedText }));

  };



  // Crear nuevo parámetro
  const handleCreate = async () => {
  // Validación de tipo de examen
  if (!form.idtipoExamen) {
    Toast.show({
      type: 'info',
      text1: '🚫 Tipo de examen requerido',
      text2: 'Debe seleccionar un tipo de examen',
      visibilityTime: 3000
    });
    return;
  }

  // Validación de nombre del parámetro
  if (!form.nombreParametro.trim()) {
    Toast.show({
      type: 'info',
      text1: '🚫 Nombre requerido',
      text2: 'El nombre del parámetro es obligatorio',
      visibilityTime: 3000
    });
    return;
  }

  if (form.nombreParametro.trim().length < 5) {
    Toast.show({
      type: 'info',
      text1: '🚫 Nombre muy corto',
      text2: 'El nombre debe tener al menos 5 caracteres',
      visibilityTime: 3000
    });
    return;
  }





    if (isSubmitting) return;

    setIsSubmitting(true);
    
    try {
      const response = await fetch(API_URL_PARAMETRO, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
    
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear parámetro');
      }

      Toast.show({
        type: 'success',
        text1: '✅ Parámetro creado',
        text2: 'El parámetro se registró correctamente',
        visibilityTime: 3000,
        onHide: () => navigation.goBack()
      });
    } catch (error) {
      console.error('Error:', error);
      Toast.show({
        type: 'error',
        text1: '❌ Error',
        text2: error.message || 'Ocurrió un error al crear el parámetro',
        visibilityTime: 3000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Crear Nuevo Parámetro</Text>

      {/* Dropdown para Tipo de Examen */}
      <View style={styles.dropdownContainer}>
        <Text style={styles.label}>Tipo de Examen *</Text>
        <Dropdown
          style={[styles.dropdown, isFocus && { borderColor: '#3a0ca3' }]}
          placeholderStyle={styles.placeholderStyle}
          selectedTextStyle={styles.selectedTextStyle}
          inputSearchStyle={styles.inputSearchStyle}
          iconStyle={styles.iconStyle}
          data={tipoexamenData}
          search
          maxHeight={300}
          labelField="label"
          valueField="value"
          placeholder={!isFocus ? 'Seleccione tipo de examen' : '...'}
          searchPlaceholder="Buscar..."
          value={form.idtipoExamen}
          onFocus={() => setIsFocus(true)}
          onBlur={() => setIsFocus(false)}
          onChange={item => {
            handleChange('idtipoExamen', item.value);
            setIsFocus(false);
          }}
          renderLeftIcon={() => (
            <Ionicons 
              name="medkit-outline" 
              size={20} 
              color={isFocus ? '#3a0ca3' : '#6c757d'} 
              style={styles.dropdownIcon}
            />
          )}
        />
      </View>

      {/* Campo Nombre del Parámetro */}
      <Text style={styles.label}>Nombre del Parámetro *</Text>
      <View style={styles.inputContainer}>
        <Ionicons name="pricetag-outline" size={20} color="#6c757d" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="EJ: GLUCOSA, HEMOGLOBINA"
          value={form.nombreParametro}
          onChangeText={handleNombreChange}
          autoCapitalize="characters"
          maxLength={20}
        />
      </View>
<Text style={styles.label}>Subtítulo *</Text>
<Dropdown
  style={[styles.dropdown, isFocus && { borderColor: '#3a0ca3' }]}
  placeholder="Seleccione subtítulo"
  data={subtitulosDisponibles}
  labelField="label"
  valueField="value"
  value={form.subtitulo}
  onChange={item => handleChange('subtitulo', item.value)}
  renderLeftIcon={() => (
    <Ionicons name="pricetags-outline" size={20} color="#6c757d" />
  )}
/>

      {/* Campo Unidad de Medida */}
      <Text style={styles.label}>Unidad de Medida</Text>
      <View style={styles.inputContainer}>
        <Ionicons name="speedometer-outline" size={20} color="#6c757d" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="EJ: MG/DL, %, ETC."
          value={form.unidadMedida}
          onChangeText={text => handleChange('unidadMedida', text)}
          autoCapitalize="characters"
        />
      </View>

      {/* Campo Valor de Referencia */}
      <Text style={styles.label}>Valor de Referencia</Text>
      <View style={styles.inputContainer}>
        <Ionicons name="thermometer-outline" size={20} color="#6c757d" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="EJ: 70-100 MG/DL"
          value={form.valorReferencia}
          onChangeText={text => handleChange('valorReferencia', text)}
        />
      </View>

            {/* Campo Nombre del OpcionesFijas */}
      <Text style={styles.label}> OpcionesFijas *</Text>
      <View style={styles.inputContainer}>
        <Ionicons name="pricetag-outline" size={20} color="#6c757d" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="EJ: Amarillo claro,Amarillo oscuro,Ámbar,Rojo,Marrón,Verde"
          value={form.OpcionesFijas}
          onChangeText={text => handleChange('OpcionesFijas', text)}

          maxLength={200}
        />
      </View>

    

      {/* Botones */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.cancelButton]}
          onPress={() => navigation.goBack()} 
          disabled={isSubmitting}
        >
          <Ionicons name="close-circle-outline" size={20} color="white" />
          <Text style={styles.buttonText}>Cancelar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.submitButton]}
          onPress={handleCreate} 
          disabled={isSubmitting}
        >
          <Ionicons name="save-outline" size={20} color="white" />
          <Text style={styles.buttonText}>
            {isSubmitting ? "Creando..." : "Crear Parámetro"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 25,
    textAlign: 'center',
    color: '#3a0ca3',
  },
  dropdownContainer: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontWeight: '600',
    color: '#495057',
  },
  dropdown: {
    height: 50,
    borderColor: '#ced4da',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    marginBottom: 15,
  },
  dropdownIcon: {
    marginRight: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderColor: '#ced4da',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 20,
  },
  inputIcon: {
    marginLeft: 12,
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: 12,
  },
  placeholderStyle: {
    fontSize: 16,
    color: '#6c757d',
  },
  selectedTextStyle: {
    fontSize: 16,
    color: '#212529',
  },
  iconStyle: {
    width: 24,
    height: 24,
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
    borderRadius: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '48%',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  submitButton: {
    backgroundColor: '#3a0ca3',
  },
  buttonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '600',
  },
});

export default CreateParametroScreen;