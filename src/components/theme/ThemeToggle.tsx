"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Sun, Moon, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState, useCallback } from "react";

interface ThemeToggleProps {
  className?: string;
}

// Definición de los temas disponibles
interface ThemeOption {
  name: string;
  value: string;
  description?: string;
  colors?: {
    primary: string;
    background: string;
    accent: string;
  };
}

// Componente para mostrar la paleta de colores del tema
const ThemePalette = ({ colors }: { colors: ThemeOption["colors"] }) => {
  if (!colors) return null;
  
  return (
    <div className="flex gap-1 mr-2">
      <div 
        className="w-3 h-3 rounded-full" 
        style={{ backgroundColor: colors.background }}
        title="Color de fondo"
      />
      <div 
        className="w-3 h-3 rounded-full" 
        style={{ backgroundColor: colors.primary }}
        title="Color primario"
      />
      <div 
        className="w-3 h-3 rounded-full" 
        style={{ backgroundColor: colors.accent }}
        title="Color de acento"
      />
    </div>
  );
};

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [customTheme, setCustomTheme] = useState<string | null>(null);
  
  // Aplicar un tema específico
  const applyTheme = useCallback((themeValue: string) => {
    // Solo ejecutar en el cliente
    if (typeof window === 'undefined') return;
    
    // Eliminar cualquier clase de tema anterior
    document.documentElement.classList.remove(
      "purple-theme",
      "amber-theme",
      "blue-theme",
      "bold-tech",
      "notebook",
    );
    
    // Guardar el tema seleccionado en localStorage para recordarlo
    localStorage.setItem('selected-theme', themeValue);
    
    // Si es un tema personalizado, agregar la clase correspondiente
    if (themeValue !== "light" && themeValue !== "dark" && themeValue !== "system") {
      document.documentElement.classList.add(themeValue);
      setCustomTheme(themeValue);
      
      // Para temas personalizados, mantener el modo claro/oscuro actual
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const currentTheme = theme || 'system';
      const isDark = currentTheme === "dark" || (currentTheme === "system" && prefersDark);
      
      // Mantener el modo oscuro/claro actual usando setTheme
      if (isDark) {
        document.documentElement.classList.add('dark');
        // Asegurarse de que next-themes sepa que estamos en modo oscuro
        setTheme('dark');
      } else {
        document.documentElement.classList.remove('dark');
        // Asegurarse de que next-themes sepa que estamos en modo claro
        setTheme('light');
      }
    } else {
      // Para temas estándar (light/dark/system), usar next-themes
      setTheme(themeValue);
      setCustomTheme(null);
    }
  }, [theme, setTheme, setCustomTheme]);
  
  // Asegurarse de que el componente esté montado antes de realizar operaciones del lado del cliente
  useEffect(() => {
    setMounted(true);
    
    // Restaurar el tema personalizado si existe en localStorage o establecer blue-theme por defecto
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('selected-theme');
      if (savedTheme && savedTheme !== 'light' && savedTheme !== 'dark' && savedTheme !== 'system') {
        setCustomTheme(savedTheme);
      } else {
        // Establecer blue-theme como predeterminado si no hay tema guardado
        setCustomTheme('blue-theme');
        applyTheme('blue-theme');
      }
    }
  }, [applyTheme]);

  // Asegurarse de que el componente solo se renderice en el cliente
  useEffect(() => {
    setMounted(true);
    
    // Restaurar el tema seleccionado al cargar la página
    const savedTheme = localStorage.getItem('selected-theme');
    if (savedTheme) {
      applyTheme(savedTheme);
      
      // Si es un tema personalizado, actualizar el estado
      if (savedTheme !== "light" && savedTheme !== "dark" && savedTheme !== "system") {
        setCustomTheme(savedTheme);
      }
    } else {
      // Si no hay tema guardado, aplicar blue-theme como predeterminado
      applyTheme("blue-theme");
      setCustomTheme("blue-theme");
    }
  }, [applyTheme]);

  // Definir los temas disponibles
  const basicThemes: ThemeOption[] = [
    { 
      name: "Light", 
      value: "light", 
      description: "Tema claro predeterminado",
      colors: {
        background: "#ffffff",
        primary: "#000000",
        accent: "#6e6e6e"
      }
    },
    { 
      name: "Dark", 
      value: "dark", 
      description: "Tema oscuro predeterminado",
      colors: {
        background: "#1c1c1c",
        primary: "#ffffff",
        accent: "#6e6e6e"
      }
    },
    { 
      name: "System", 
      value: "system", 
      description: "Basado en la configuración del sistema",
      colors: {
        background: "#f5f5f5",
        primary: "#1c1c1c",
        accent: "#6e6e6e"
      }
    },
  ];
  
  const customThemes: ThemeOption[] = [
    { 
      name: "Purple", 
      value: "purple-theme", 
      description: "Tema con tonos morados",
      colors: {
        background: "#f8f7ff",
        primary: "#ac4cb7",
        accent: "#e4f1e4"
      }
    },
    { 
      name: "Amber", 
      value: "amber-theme", 
      description: "Tema con tonos ámbar",
      colors: {
        background: "#fffaf0",
        primary: "#bb8a35",
        accent: "#d4a95f"
      }
    },
    { 
      name: "Blue", 
      value: "blue-theme", 
      description: "Tema con tonos azules",
      colors: {
        background: "#f0f8ff",
        primary: "#3b82f6",
        accent: "#93c5fd"
      }
    },
    { 
      name: "Bold Tech", 
      value: "bold-tech", 
      description: "Tema con estilo tecnológico",
      colors: {
        background: "#ffffff",
        primary: "#9b4dff",
        accent: "#eef2ff"
      }
    },
    { 
      name: "Notebook", 
      value: "notebook", 
      description: "Tema estilo cuaderno",
      colors: {
        background: "#fafafa",
        primary: "#7d7d7d",
        accent: "#f0e68c"
      }
    },
  ];

  // Obtener el nombre del tema personalizado actual
  // const getCurrentCustomThemeName = () => {
  //   if (!mounted || !customTheme) return "";
  //   const current = customThemes.find(t => t.value === customTheme);
  //   return current ? current.name : "";
  // };

  // Alternar entre modo claro y oscuro
  const toggleLightDark = () => {
    // Si hay un tema personalizado activo, solo cambiamos el modo claro/oscuro
    // pero mantenemos el tema personalizado
    if (customTheme) {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const currentTheme = theme || 'system';
      const isDark = currentTheme === "dark" || (currentTheme === "system" && prefersDark);
      
      // Cambiar entre modo claro y oscuro manteniendo el tema personalizado
      if (isDark) {
        document.documentElement.classList.remove('dark');
        setTheme("light");
      } else {
        document.documentElement.classList.add('dark');
        setTheme("dark");
      }
      
      // Guardar el tema personalizado en localStorage para mantenerlo
      localStorage.setItem('selected-theme', customTheme);
    } else {
      // Si no hay tema personalizado, simplemente alternamos entre light y dark
      const newTheme = theme === "dark" ? "light" : "dark";
      applyTheme(newTheme);
    }
  };

  if (!mounted) {
    return (
      <div className="flex gap-2">
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Cargando temas</span>
        </Button>
        <Button variant="outline" size="icon">
          <Palette className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Cargando temas</span>
        </Button>
      </div>
    );
  }

  // Evitar renderizado en el servidor para prevenir errores de hidratación
  if (!mounted) {
    return <Button variant="ghost" size="icon" className={cn("w-9 h-9", className)} disabled>
      <Palette className="h-4 w-4" />
    </Button>;
  }
  
  return (
    <div className={cn("flex gap-2", className)}>
      {/* Botón para alternar entre claro y oscuro */}
      <Button 
        variant="outline" 
        size="icon"
        className={customTheme ? "border-primary" : ""}
        onClick={toggleLightDark}
        // title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      >
        <div className="relative w-[1.2rem] h-[1.2rem]">
          <Sun className="absolute inset-0 h-full w-full rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute inset-0 h-full w-full rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </div>
        <span className="sr-only">Alternar modo claro/oscuro</span>
      </Button>
      
      {/* Botón para seleccionar temas personalizados */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="icon"
            className={customTheme ? "border-primary" : ""}
            // title="Seleccionar tema personalizado"
          >
            <Palette className="h-[1.2rem] w-[1.2rem]" />
            <span className="sr-only">Selector de tema personalizado</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Temas personalizados</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => applyTheme("system")}
            className="flex justify-between items-center"
          >
            <div className="flex items-center">
              <ThemePalette colors={basicThemes.find(t => t.value === "system")?.colors} />
              <span>Predeterminado (Sistema)</span>
            </div>
            {!customTheme && (
              <span className="text-primary">✓</span>
            )}
          </DropdownMenuItem>
          {customThemes.map((themeOption) => (
            <DropdownMenuItem 
              key={themeOption.value}
              onClick={() => applyTheme(themeOption.value)}
              className="flex justify-between items-center"
            >
              <div className="flex items-center">
                <ThemePalette colors={themeOption.colors} />
                <span>{themeOption.name}</span>
              </div>
              {customTheme === themeOption.value && (
                <span className="text-primary">✓</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>    
  );
}