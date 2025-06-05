declare namespace google.maps {
  class event {
    static clearInstanceListeners(instance: any): void;
  }
}

declare namespace google.maps.places {
  interface Autocomplete {
    addListener(eventName: string, handler: () => void): void;
    getPlace(): Place;
  }

  interface Place {
    formatted_address?: string;
    geometry?: {
      location?: {
        lat(): number;
        lng(): number;
      };
    };
  }

  interface AutocompleteOptions {
    fields: string[];
    types: string[];
  }
}

interface Window {
  google?: {
    maps?: {
      places?: {
        Autocomplete: new (
          inputField: HTMLInputElement,
          opts?: google.maps.places.AutocompleteOptions
        ) => google.maps.places.Autocomplete;
      };
    };
  };
} 