"use client";

import { X } from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type DocumentTagsInputProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
};

export function DocumentTagsInput({
  value,
  onChange,
  suggestions = [],
}: DocumentTagsInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [open, setOpen] = useState(false);

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !value.includes(trimmedTag)) {
      onChange([...value, trimmedTag]);
    }
    setInputValue("");
    setOpen(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag(inputValue);
    } else if (e.key === "Backspace" && inputValue === "" && value.length > 0) {
      // Remove last tag on backspace when input is empty
      const lastTag = value.at(-1);
      if (lastTag) {
        handleRemoveTag(lastTag);
      }
    }
  };

  const filteredSuggestions = suggestions.filter(
    (suggestion) =>
      !value.includes(suggestion) &&
      suggestion.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className="space-y-2">
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              onChange={(e) => {
                setInputValue(e.target.value);
                setOpen(e.target.value.length > 0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Add tags (press Enter or comma to add)"
              type="text"
              value={inputValue}
            />
          </div>
        </PopoverTrigger>
        {filteredSuggestions.length > 0 && (
          <PopoverContent align="start" className="w-full p-0">
            <Command>
              <CommandList>
                <CommandEmpty>No suggestions found.</CommandEmpty>
                <CommandGroup>
                  {filteredSuggestions.map((suggestion) => (
                    <CommandItem
                      key={suggestion}
                      onSelect={() => handleAddTag(suggestion)}
                    >
                      {suggestion}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        )}
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
              <Button
                className="ml-1 size-4 p-0 hover:bg-transparent"
                onClick={() => handleRemoveTag(tag)}
                size="sm"
                variant="ghost"
              >
                <X className="size-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
