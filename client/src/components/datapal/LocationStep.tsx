import React, { useState, useEffect, useMemo } from "react";
import { MultiSelectCombobox, ComboboxOption } from "./MultiSelectCombobox";
import { PostalCodeField } from "./PostalCodeField";
import { locationService, StructuredLocationScope } from "@/services/locationService";
import { Input } from "@/components/ui/input";
import { RotateCcw, MapPin, Sparkles } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LocationStepProps {
  scope: StructuredLocationScope;
  onChangeScope: (scope: StructuredLocationScope) => void;
  showError?: boolean;
}

export function LocationStep({
  scope,
  onChangeScope,
  showError,
}: LocationStepProps) {
  const [countriesList, setCountriesList] = useState<ComboboxOption[]>([]);
  const [statesList, setStatesList] = useState<ComboboxOption[]>([]);
  const [citiesList, setCitiesList] = useState<ComboboxOption[]>([]);
  const [localities, setLocalities] = useState<string[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [confirmSelectAllCountries, setConfirmSelectAllCountries] = useState(false);

  // 1. Load Countries on mount
  useEffect(() => {
    let mounted = true;
    setLoadingCountries(true);
    locationService.getCountries().then((list) => {
      if (mounted) {
        setCountriesList(
          list.map((c) => ({
            id: c.code || c.id,
            name: c.name,
            code: c.code,
            dialCode: c.dialCode,
            isPopular: c.isPopular,
          }))
        );
        setLoadingCountries(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Load States whenever countries selection changes
  useEffect(() => {
    let mounted = true;
    if (scope.countries.length === 0) {
      setStatesList([]);
      return;
    }

    setLoadingStates(true);
    Promise.all(
      scope.countries.map(async (code) => {
        const countryName = countriesList.find((c) => c.code === code)?.name || code;
        const states = await locationService.getStates(code);
        return states.map((s) => ({
          id: s.id,
          name: s.name,
          group: scope.countries.length > 1 ? countryName : undefined,
        }));
      })
    ).then((results) => {
      if (mounted) {
        setStatesList(results.flat());
        setLoadingStates(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [scope.countries, countriesList]);

  // 3. Load Cities whenever state or country changes
  useEffect(() => {
    let mounted = true;
    if (scope.countries.length === 0) {
      setCitiesList([]);
      return;
    }

    setLoadingCities(true);
    const countryCode = scope.countries[0];
    const statesToFetch =
      scope.states === "ALL" || scope.states.length === 0
        ? ["ALL"]
        : scope.states;

    Promise.all(
      statesToFetch.map(async (st) => {
        const cities = await locationService.getCities(countryCode, st === "ALL" ? undefined : st);
        return cities.map((c) => ({
          id: c.id,
          name: c.name,
          group: st !== "ALL" && statesToFetch.length > 1 ? st : undefined,
        }));
      })
    ).then((results) => {
      if (mounted) {
        setCitiesList(results.flat());
        setLoadingCities(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [scope.countries, scope.states]);

  // 4. Load dynamic localities for area input if single city is chosen
  useEffect(() => {
    const singleCity =
      scope.cities !== "ALL" && scope.cities.length === 1 ? scope.cities[0] : null;
    if (singleCity) {
      locationService.getLocalities(singleCity).then(setLocalities);
    } else {
      setLocalities([]);
    }
  }, [scope.cities]);

  // Dynamic placeholders
  const areaPlaceholder = useMemo(() => {
    if (scope.cities !== "ALL" && scope.cities.length === 1) {
      return localities.length > 0
        ? `e.g. ${localities.slice(0, 3).join(", ")}...`
        : `Localities in ${scope.cities[0]}...`;
    }
    if (scope.states !== "ALL" && scope.states.length === 1) {
      return `Neighborhood or sector in ${scope.states[0]}...`;
    }
    if (scope.countries.length === 1) {
      return "Neighborhood, district or commercial zone...";
    }
    return "Neighborhood, district or area";
  }, [scope.cities, scope.states, scope.countries, localities]);

  // Dynamic quick-pick chips (top cities of selected country/state)
  const quickPickChips = useMemo(() => {
    if (citiesList.length > 0) {
      return citiesList.slice(0, 5).map((c) => c.name);
    }
    return ["Mumbai", "Delhi", "Bangalore", "New York", "London"];
  }, [citiesList]);

  // Clear location handler
  const handleClearLocation = () => {
    onChangeScope({
      countries: [],
      states: "ALL",
      cities: "ALL",
      area: "",
      postalCode: "",
    });
  };

  // Quick pick click
  const handleQuickPickCity = (cityName: string) => {
    onChangeScope({
      ...scope,
      cities: [cityName],
    });
  };

  const isSingleCountry = scope.countries.length === 1;
  const isSingleCity = scope.cities !== "ALL" && scope.cities.length === 1;

  return (
    <div className="space-y-5">
      {/* ── ROW 1: Country | State | City ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Country */}
        <MultiSelectCombobox
          label="Country"
          stepBadge="1"
          placeholder="Select country..."
          options={countriesList}
          selectedValues={scope.countries.map((c) => {
            const found = countriesList.find((co) => co.code === c);
            return found ? found.name : c;
          })}
          onChange={(newVals) => {
            const codes = newVals.map((val) => {
              const found = countriesList.find((co) => co.name === val || co.code === val);
              return found?.code || val;
            });
            onChangeScope({
              ...scope,
              countries: codes,
              states: "ALL",
              cities: "ALL",
              area: "",
              postalCode: "",
            });
          }}
          selectAllLabel="Select all countries"
          onToggleSelectAll={() => setConfirmSelectAllCountries(true)}
          isCountry
          loading={loadingCountries}
        />

        {/* State */}
        <MultiSelectCombobox
          label="State / Region"
          stepBadge="2"
          placeholder={scope.states === "ALL" ? "All states (Nationwide)" : "Select state..."}
          options={statesList}
          selectedValues={scope.states === "ALL" ? [] : scope.states}
          onChange={(newVals) => {
            onChangeScope({
              ...scope,
              states: newVals.length === 0 ? "ALL" : newVals,
              cities: "ALL",
            });
          }}
          disabled={scope.countries.length === 0}
          disabledReason="Select country first"
          selectAllLabel={
            scope.countries.length === 1
              ? `All states in ${countriesList.find((c) => c.code === scope.countries[0])?.name || "Country"}`
              : "All states"
          }
          isAllSelected={scope.states === "ALL"}
          onToggleSelectAll={() => {
            onChangeScope({
              ...scope,
              states: scope.states === "ALL" ? [] : "ALL",
              cities: "ALL",
            });
          }}
          loading={loadingStates}
        />

        {/* City */}
        <MultiSelectCombobox
          label="City"
          stepBadge="3"
          placeholder={scope.cities === "ALL" ? "All cities" : "Select city..."}
          options={citiesList}
          selectedValues={scope.cities === "ALL" ? [] : scope.cities}
          onChange={(newVals) => {
            onChangeScope({
              ...scope,
              cities: newVals.length === 0 ? "ALL" : newVals,
            });
          }}
          disabled={scope.countries.length === 0}
          disabledReason="Select country & state first"
          selectAllLabel="All cities"
          isAllSelected={scope.cities === "ALL"}
          onToggleSelectAll={() => {
            onChangeScope({
              ...scope,
              cities: scope.cities === "ALL" ? [] : "ALL",
            });
          }}
          loading={loadingCities}
        />
      </div>

      {/* ── ROW 2: Area or Locality (wider) | Postal Code (narrower) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
        {/* Area / Locality (2 cols) */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-md bg-slate-300 text-white flex items-center justify-center text-[10px] font-extrabold">
                4
              </span>
              Area / Locality / Neighborhood{" "}
              <span className="text-slate-400 font-normal normal-case">(optional)</span>
            </span>
            {!isSingleCity && (
              <span className="text-[11px] font-normal normal-case text-slate-400">
                (Pick a single city to target an area)
              </span>
            )}
          </label>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={scope.area || ""}
              onChange={(e) => onChangeScope({ ...scope, area: e.target.value })}
              disabled={!isSingleCity}
              placeholder={areaPlaceholder}
              className={`pl-10 h-12 bg-white rounded-2xl border text-sm font-medium ${
                !isSingleCity
                  ? "bg-slate-50 border-gray-200 opacity-60 cursor-not-allowed"
                  : "border-gray-200 focus:border-indigo-400 ring-2 ring-indigo-500/10"
              }`}
            />
          </div>
        </div>

        {/* Postal Code (1 col) */}
        <div className="md:col-span-1">
          <PostalCodeField
            countryCode={isSingleCountry ? scope.countries[0] : undefined}
            value={scope.postalCode || ""}
            onChange={(val) => onChangeScope({ ...scope, postalCode: val })}
            disabled={!isSingleCountry}
          />
        </div>
      </div>

      {/* ── ROW 3: Quick Pick Chips + Clear Location ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2 overflow-x-auto max-w-full no-scrollbar py-0.5">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Quick cities:
          </span>
          {quickPickChips.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => handleQuickPickCity(city)}
              className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                scope.cities !== "ALL" && scope.cities.includes(city)
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-white text-slate-700 border-gray-200 hover:border-indigo-300 hover:bg-slate-50"
              }`}
            >
              {city}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleClearLocation}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 shrink-0 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Clear location</span>
        </button>
      </div>

      {/* Select All Countries Confirmation Dialog */}
      <AlertDialog open={confirmSelectAllCountries} onOpenChange={setConfirmSelectAllCountries}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Select all countries?</AlertDialogTitle>
            <AlertDialogDescription>
              Searching across all countries worldwide will generate a very broad dataset.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onChangeScope({
                  ...scope,
                  countries: countriesList.map((c) => c.code || c.id),
                  states: "ALL",
                  cities: "ALL",
                });
                setConfirmSelectAllCountries(false);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
            >
              Confirm All Countries
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
