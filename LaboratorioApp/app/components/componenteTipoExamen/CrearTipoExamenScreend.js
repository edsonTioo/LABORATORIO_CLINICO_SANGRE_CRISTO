import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Platform,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, FontAwesome, Ionicons } from "@expo/vector-icons";
import { Button } from "react-native-paper";
import Toast from 'react-native-toast-message';


const CrearTipoExamenScreen = () => {
  const [form, setForm] = useState({
    nombreExamen: "",
    descripcion: "",
    precio: "",
    subtitulos: "" // Cadena libre separada por comas
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigation = useNavigation();

  const API_URL =
    Platform.OS === "android"
      ? "http://10.0.2.2:5090/api/TipoExamen"
      : "http://localhost:5090/api/TipoExamen";

  const handleChange = (name, value) => {
    // Si es el campo nombreExamen, aplicar las validaciones especiales
    if (name === "nombreExamen") {
      // Eliminar caracteres no deseados (solo letras, números y espacios)
      const cleanedText = value.replace(/[^a-zA-Z0-9 áéíóúÁÉÍÓÚñÑ]/g, "");
      // Convertir a mayúsculas
      value = cleanedText.toUpperCase();
    }

    setForm((prev) => ({ ...prev, [name]: value }));
    // Limpiar error cuando se edita
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async () => {
    if (!form.nombreExamen.trim()) {
      Toast.show({
        type: "info",
        text1: "🚫 Nombre requerido",
        text2: "El nombre del examen es obligatorio",
        visibilityTime: 3000,
      });
      return;
    }

    if (form.nombreExamen.trim().length < 3) {
      Toast.show({
        type: "info",
        text1: "🚫 Nombre muy corto",
        text2: "El nombre debe tener al menos 3 caracteres",
        visibilityTime: 3000,
      });
      return;
    }

    // Validación de la descripción (opcional pero con límite de caracteres)
    if (!form.descripcion.trim()) {
      Toast.show({
        type: "info",
        text1: "🚫 Descripción requerida",
        text2: "La descripción es obligatoria",
        visibilityTime: 3000,
      });
      return;
    }
    if (form.descripcion.length > 200) {
      Toast.show({
        type: "info",
        text1: "🚫 Descripción muy larga",
        text2: "La descripción no puede exceder los 20 caracteres",
        visibilityTime: 3000,
      });
      return;
    }

    // Validación del precio
    if (!form.precio.trim()) {
      Toast.show({
        type: "info",
        text1: "🚫 Precio requerido",
        text2: "Debe ingresar un precio para el examen",
        visibilityTime: 3000,
      });
      return;
    }

    const precioNumber = parseFloat(form.precio);
    if (isNaN(precioNumber)) {
      Toast.show({
        type: "info",
        text1: "🚫 Precio inválido",
        text2: "El precio debe ser un número válido",
        visibilityTime: 3000,
      });
      return;
    }

    if (precioNumber <= 0) {
      Toast.show({
        type: "info",
        text1: "🚫 Precio inválido",
        text2: "El precio debe ser mayor a 0",
        visibilityTime: 3000,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          precio: parseFloat(form.precio),
          subtitulos: form.subtitulos // Enviará el string directo
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Error al crear el tipo de examen"
        );
      }
      Toast.show({
        type: "success",
        text1: "✅ Examen creado",
        text2: "El tipo de examen se registró correctamente",
        visibilityTime: 3000,
        onHide: () => navigation.goBack(),
      });
    } catch (error) {
      console.error("Error:", error);
      Toast.show({
        type: "error",
        text1: "❌ Error",
        text2: error.message || "Ocurrió un error al guardar",
        visibilityTime: 3000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Nuevo Tipo de Examen</Text>
        </View>

        {/* Campo Nombre del Examen */}
        <View style={styles.inputContainer}>
          <FontAwesome
            name="flask"
            size={20}
            color="#555"
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            placeholder="Nombre del examen (solo letras, números y espacios)"
            value={form.nombreExamen}
            onChangeText={(text) => handleChange("nombreExamen", text)}
            placeholderTextColor="#999"
            autoCapitalize="characters"
          />
        </View>
        {errors.nombreExamen && (
          <Text style={styles.errorText}>{errors.nombreExamen}</Text>
        )}

        {/* Campo Descripción */}
        <View style={styles.inputContainer}>
          <MaterialIcons
            name="description"
            size={20}
            color="#555"
            style={styles.icon}
          />
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Descripción (opcional)"
            value={form.descripcion}
            onChangeText={(text) => handleChange("descripcion", text)}
            multiline
            numberOfLines={3}
            placeholderTextColor="#999"
          />
        </View>

        {/* Campo Precio */}
        <View style={styles.inputContainer}>
          <FontAwesome
            name="money"
            size={20}
            color="#555"
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            placeholder="Precio"
            value={form.precio}
            onChangeText={(text) => handleChange("precio", text)}
            keyboardType="decimal-pad"
            placeholderTextColor="#999"
          />
        </View>
        {errors.precio && <Text style={styles.errorText}>{errors.precio}</Text>}
<View style={styles.inputContainer}>
  <MaterialIcons name="list" size={20} color="#555" style={styles.icon} />
  <TextInput
    style={styles.input}
    placeholder="Subtítulos (separados por comas, ej: Físico,Químico,Microscópico)"
    value={form.subtitulos}
    onChangeText={(text) => handleChange("subtitulos", text)}
    placeholderTextColor="#999"
  />
</View>

        <View style={styles.buttonGroup}>
          <Button
            mode="outlined"
            style={styles.cancelButton}
            labelStyle={styles.cancelButtonText}
            onPress={() => navigation.goBack()}
            icon="close"
          >
            Cancelar
          </Button>

          <Button
            mode="contained"
            style={styles.submitButton}
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
            icon="check"
          >
            {isSubmitting ? "Guardando..." : "Guardar"}
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: "#333",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  icon: {
    marginRight: 10,
    width: 24,
    textAlign: "center",
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: "#333",
  },
  multilineInput: {
    height: 100,
    textAlignVertical: "top",
    paddingVertical: 15,
  },
  errorText: {
    color: "#d32f2f",
    fontSize: 14,
    marginBottom: 15,
    marginLeft: 40,
  },
  buttonGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
  },
  cancelButton: {
    flex: 1,
    marginRight: 10,
    borderColor: "#d32f2f",
    borderWidth: 1,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: "#d32f2f",
  },
  submitButton: {
    flex: 2,
    backgroundColor: "#388e3c",
    borderRadius: 8,
    elevation: 2,
  },
});

export default CrearTipoExamenScreen;
