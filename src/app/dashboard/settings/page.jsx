'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
export default function SettingsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const { setTheme } = useTheme();
    const handleProfileUpdate = (e) => {
        e.preventDefault();
        toast({
            title: 'Profile Updated',
            description: 'Your name has been successfully updated.',
        });
    };
    const formatRole = (role) => {
        let formatted = role.role;
        if (role.state) {
            formatted += ` (${role.state}`;
            if (role.division) {
                formatted += ` - ${role.division}`;
            }
            formatted += ')';
        }
        return formatted;
    };
    return (<div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              This is how others will see you on the site.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleProfileUpdate}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" defaultValue={user === null || user === void 0 ? void 0 : user.name}/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={user === null || user === void 0 ? void 0 : user.email} disabled/>
              </div>
              <div className="space-y-2">
                <Label>Roles</Label>
                 <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-2 min-h-[40px]">
                    {user === null || user === void 0 ? void 0 : user.roles.map((role, index) => (<Badge key={index} variant="secondary" className="text-sm">
                            {formatRole(role)}
                        </Badge>))}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit">Save Changes</Button>
            </CardFooter>
          </form>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Theme</CardTitle>
            <CardDescription>
              Choose how you want to experience VisitWise.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted p-1">
              <Button variant="outline" size="sm" onClick={() => setTheme('light')} className="flex justify-center items-center gap-2">
                <Sun className="h-4 w-4"/>
                Light
              </Button>
              <Button variant="outline" size="sm" onClick={() => setTheme('dark')} className="flex justify-center items-center gap-2">
                <Moon className="h-4 w-4"/>
                Dark
              </Button>
               <Button variant="outline" size="sm" onClick={() => setTheme('system')}>
                System
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>);
}
