import re

with open('src/components/service-selection-dialog.tsx', 'r') as f:
    content = f.read()

# Replace X import with Trash2 and add Table imports
if "Trash2" not in content:
    content = content.replace("import { X } from 'lucide-react';", "import { X, Trash2 } from 'lucide-react';\nimport { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';")

old_divider = "{selectedServices.length > 0 && <hr />}"

# Find the block where selectedServices.map is
old_render_start = "{selectedServices.map((serviceName) => ("
old_render_end_regex = r"\}\)\}\s*\{mode === 'Free Trial'"

# The new table render block
new_table_block = """{selectedServices.length > 0 && (
                          <div className="rounded-md border mt-6">
                            <Table>
                              <TableHeader className="bg-muted/50">
                                <TableRow>
                                  <TableHead>Service</TableHead>
                                  <TableHead>Frequency</TableHead>
                                  {(mode === 'Signup' || mode === 'Quote') && <TableHead className="w-[120px]">Rate</TableHead>}
                                  <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {selectedServices.map((serviceName) => (
                                  <TableRow key={serviceName}>
                                    <TableCell className="font-medium align-top pt-4">
                                      {serviceName}
                                    </TableCell>
                                    <TableCell className="align-top">
                                      <FormField
                                        control={form.control}
                                        name={`frequencies.${serviceName}`}
                                        render={({ field }) => (
                                          <FormItem className="space-y-2">
                                            <FormControl>
                                              <Select
                                                onValueChange={(val) => {
                                                  if (val === 'Adhoc') {
                                                    field.onChange('Adhoc');
                                                  } else if (val === 'Daily') {
                                                    field.onChange(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
                                                  } else {
                                                    field.onChange([]); // Custom, start empty
                                                  }
                                                }}
                                                value={
                                                  field.value === 'Adhoc' ? 'Adhoc' : 
                                                  (Array.isArray(field.value) && field.value.length === 5) ? 'Daily' : 'Custom'
                                                }
                                              >
                                                <SelectTrigger className="w-full min-w-[140px] h-9">
                                                  <SelectValue placeholder="Frequency" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="Daily">Daily (Mon-Fri)</SelectItem>
                                                  <SelectItem value="Adhoc">Adhoc (On Demand)</SelectItem>
                                                  <SelectItem value="Custom">Custom Days</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </FormControl>
                                            
                                            {field.value !== 'Adhoc' && (!Array.isArray(field.value) || field.value.length !== 5) && (
                                              <div className="flex gap-1 pt-1">
                                                {days.map((day) => {
                                                  const isChecked = Array.isArray(field.value) && field.value.includes(day);
                                                  return (
                                                    <Button
                                                      key={day}
                                                      type="button"
                                                      variant={isChecked ? "default" : "outline"}
                                                      size="sm"
                                                      className="h-7 w-7 p-0 text-[10px]"
                                                      onClick={() => {
                                                        const current = Array.isArray(field.value) ? field.value : [];
                                                        const next = isChecked ? current.filter(d => d !== day) : [...current, day];
                                                        field.onChange(next);
                                                      }}
                                                    >
                                                      {day.charAt(0)}
                                                    </Button>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </FormItem>
                                        )}
                                      />
                                    </TableCell>
                                    
                                    {(mode === 'Signup' || mode === 'Quote') && (
                                      <TableCell className="align-top">
                                        <FormField
                                          control={form.control}
                                          name={`rates.${serviceName}`}
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormControl>
                                                <div className="relative">
                                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                                  <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    placeholder="0.00"
                                                    className="pl-6 h-9"
                                                    {...field}
                                                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                                    value={field.value || ''}
                                                  />
                                                </div>
                                              </FormControl>
                                            </FormItem>
                                          )}
                                        />
                                      </TableCell>
                                    )}
                                    
                                    <TableCell className="align-top text-right">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                                        onClick={() => {
                                          const newSelected = selectedServices.filter(s => s !== serviceName);
                                          form.setValue('selectedServices', newSelected);
                                          
                                          const freqs = { ...form.getValues('frequencies') };
                                          delete freqs[serviceName];
                                          form.setValue('frequencies', freqs);
                                          
                                          const rates = { ...form.getValues('rates') };
                                          if (rates[serviceName]) {
                                            delete rates[serviceName];
                                            form.setValue('rates', rates);
                                          }
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                        
                        {mode === 'Free Trial'"""

# The tricky part is replacing from {selectedServices.length > 0 && <hr />} up to {mode === 'Free Trial'
# We will use regex
import re
pattern = re.compile(r'\{selectedServices\.length > 0 && <hr />\}.*?\{mode === \'Free Trial\'', re.DOTALL)
content = pattern.sub(new_table_block, content)

with open('src/components/service-selection-dialog.tsx', 'w') as f:
    f.write(content)

