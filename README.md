# regsecedit
RegSecEdit v0.2 - Edit Registry Security

###Usage

Example: Add permissions to registry sub tree node for ASPNET user. Include all permissions except Delete. Registry sub node is in Machine branch.

`regsecedit -u:ASPNET -p:Software\MyAppRegistrySettings -b:Machine -i:1 -a:0 -r:983103 -e:65536`

###Mandatory parameters:

`-p`:	Path to key (e.g. `SOFTWARE\appname\myvalues`)

`-b`:  	Main Branch. <br>

Values:

- `Machine`<br> 
- `User`

`-u`:  	User (e.g. ASPNET)

`-a`:  	Access Control Type<br>
HelpLink:[https://msdn.microsoft.com/en-us/library/w4ds5h86.aspx](https://msdn.microsoft.com/en-us/library/w4ds5h86.aspx)<br>
Values:<br>

- Deny = `1`
- Allow = `0`

`-r`:  	Permission <br>
HelpLink: [https://msdn.microsoft.com/en-us/library/system.security.accesscontrol.registryrights.aspx](https://msdn.microsoft.com/en-us/library/system.security.accesscontrol.registryrights.aspx)

Values:

- QueryValues = `1`
- SetValue = `2`
- CreateSubKey = `4`
- EnumerateSubKeys = `8`
- Notify = `16`
- CreateLink = `32`
- Delete = `65536`
- ReadPermissions = `131072`
- WriteKey = `131078`
- ExecuteKey = `131097`
- ReadKey = `131097`
- ChangePermissions = `262144`
- TakeOwnership = `524288`
- FullControl = `983103`
			

###Optional parameters:

`-i`:  	InheritanceFlags<br>
Default value: None<br>
HelpLink: [https://msdn.microsoft.com/en-us/library/system.security.accesscontrol.inheritanceflags.aspx](https://msdn.microsoft.com/en-us/library/system.security.accesscontrol.inheritanceflags.aspx)

Values:

- None = `0`
- ContainerInherit = `1`
- ObjectInherit = `2`

`-o`:  	PropagationFlags<br>
Default value: `0` (None)

HelpLink: [https://msdn.microsoft.com/en-us/library/system.security.accesscontrol.propagationflags.aspx](https://msdn.microsoft.com/en-us/library/system.security.accesscontrol.propagationflags.aspx)

Values:

- None = `0`
- NoPropagateInherit = `1`
- InheritOnly = `2`

`-e`:  	Permission to exclude. <br>
See `-r`: parameter for references.
Use same value set from -r: parameter
Note: Use only when using FullControl in -r: parameter.
