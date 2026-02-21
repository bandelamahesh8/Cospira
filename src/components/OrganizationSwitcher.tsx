import * as React from "react";
import { 
    Check, 
    ChevronsUpDown, 
    PlusCircle, 
    Building2, 
    Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useOrganization } from "@/contexts/useOrganization";

interface OrganizationSwitcherProps {
    className?: string;
    onCreateClick: () => void;
    onSettingsClick: () => void;
}

export function OrganizationSwitcher({ 
    className, 
    onCreateClick,
    onSettingsClick 
}: OrganizationSwitcherProps) {
  const { organizations, currentOrganization, setCurrentOrganization } = useOrganization();
  const [open, setOpen] = React.useState(false);

  // Group by role? Phase 4 enhancement. For now flat list.
  
  const formattedOrgs = organizations.map((org) => ({
    label: org.name,
    value: org.id,
    ...org
  }));

  const selectedOrg = formattedOrgs.find((org) => org.id === currentOrganization?.id);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select a team"
          className={cn(
              "w-[200px] justify-between", // Base
              "h-12 rounded-2xl bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/20 text-white hover:text-white transition-all", // Custom Style matching Dashboard
              className
          )}
        >
          <div className="flex items-center gap-2 truncate">
              <div className="w-6 h-6 rounded-md bg-indigo-500/20 flex items-center justify-center shrink-0">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <span className="truncate text-xs font-bold uppercase tracking-wider">
                  {selectedOrg ? selectedOrg.label : "Select Org"}
              </span>
          </div>
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0 bg-[#0c1016] border-white/10 rounded-xl overflow-hidden shadow-2xl">
        <Command className="bg-transparent">
          <CommandList>
            <CommandInput placeholder="Search organization..." className="h-10 text-[10px] uppercase font-bold tracking-widest text-white/50 border-white/5" />
            <CommandEmpty className="py-4 text-center text-xs text-white/30">No organization found.</CommandEmpty>
            
            {formattedOrgs.length > 0 && (
                <CommandGroup heading="Organizations" className="text-white/30">
                {formattedOrgs.map((org) => (
                    <CommandItem
                        key={org.id}
                        onSelect={() => {
                            setCurrentOrganization(org);
                            setOpen(false);
                        }}
                        className="text-sm data-[selected=true]:bg-white/5 data-[selected=true]:text-white cursor-pointer py-3 px-3"
                    >
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center mr-2 border ${
                            currentOrganization?.id === org.id 
                            ? 'bg-indigo-500 text-white border-indigo-500' 
                            : 'bg-white/5 border-white/10 text-white/30'
                        }`}>
                            <Building2 className="w-3.5 h-3.5" />
                        </div>
                        
                        <span className="flex-1 font-medium truncate">{org.name}</span>
                        {currentOrganization?.id === org.id && (
                            <Check className="ml-auto h-4 w-4 text-indigo-400" />
                        )}
                        
                        {/* Settings Shortcut? Maybe confusing inside select. Keep separate */}
                    </CommandItem>
                ))}
                </CommandGroup>
            )}
          </CommandList>
          <CommandSeparator className="bg-white/5" />
          <CommandList>
            <CommandGroup>
                <CommandItem
                    onSelect={() => {
                        setOpen(false);
                        onCreateClick();
                    }}
                    className="cursor-pointer data-[selected=true]:bg-white/5 data-[selected=true]:text-white py-3 px-3 gap-2"
                >
                    <PlusCircle className="h-4 w-4 text-white/50" />
                    <span className="font-bold text-xs uppercase tracking-wider text-white/70">Create Organization</span>
                </CommandItem>
                
                {selectedOrg && (
                    <CommandItem
                        onSelect={() => {
                            setOpen(false);
                            onSettingsClick();
                        }}
                        className="cursor-pointer data-[selected=true]:bg-white/5 data-[selected=true]:text-white py-3 px-3 gap-2"
                    >
                        <Settings className="h-4 w-4 text-white/50" />
                        <span className="font-bold text-xs uppercase tracking-wider text-white/70">Settings</span>
                    </CommandItem>
                )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
