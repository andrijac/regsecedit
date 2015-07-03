﻿//------------------------------------------------------------------------------
// <auto-generated>
//     This code was generated by a tool.
//     Runtime Version:4.0.30319.18444
//
//     Changes to this file may cause incorrect behavior and will be lost if
//     the code is regenerated.
// </auto-generated>
//------------------------------------------------------------------------------

namespace regsecedit {
    using System;
    
    
    /// <summary>
    ///   A strongly-typed resource class, for looking up localized strings, etc.
    /// </summary>
    // This class was auto-generated by the StronglyTypedResourceBuilder
    // class via a tool like ResGen or Visual Studio.
    // To add or remove a member, edit your .ResX file then rerun ResGen
    // with the /str option, or rebuild your VS project.
    [global::System.CodeDom.Compiler.GeneratedCodeAttribute("System.Resources.Tools.StronglyTypedResourceBuilder", "4.0.0.0")]
    [global::System.Diagnostics.DebuggerNonUserCodeAttribute()]
    [global::System.Runtime.CompilerServices.CompilerGeneratedAttribute()]
    internal class Resources {
        
        private static global::System.Resources.ResourceManager resourceMan;
        
        private static global::System.Globalization.CultureInfo resourceCulture;
        
        [global::System.Diagnostics.CodeAnalysis.SuppressMessageAttribute("Microsoft.Performance", "CA1811:AvoidUncalledPrivateCode")]
        internal Resources() {
        }
        
        /// <summary>
        ///   Returns the cached ResourceManager instance used by this class.
        /// </summary>
        [global::System.ComponentModel.EditorBrowsableAttribute(global::System.ComponentModel.EditorBrowsableState.Advanced)]
        internal static global::System.Resources.ResourceManager ResourceManager {
            get {
                if (object.ReferenceEquals(resourceMan, null)) {
                    global::System.Resources.ResourceManager temp = new global::System.Resources.ResourceManager("regsecedit.Resources", typeof(Resources).Assembly);
                    resourceMan = temp;
                }
                return resourceMan;
            }
        }
        
        /// <summary>
        ///   Overrides the current thread's CurrentUICulture property for all
        ///   resource lookups using this strongly typed resource class.
        /// </summary>
        [global::System.ComponentModel.EditorBrowsableAttribute(global::System.ComponentModel.EditorBrowsableState.Advanced)]
        internal static global::System.Globalization.CultureInfo Culture {
            get {
                return resourceCulture;
            }
            set {
                resourceCulture = value;
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to RegSecEdit v0.2 - Edit Registry Security
        ///https://github.com/andrijac/regsecedit
        ///
        ///
        ///Usage Example: Add permissions to registry sub tree node for ASPNET user. Include all permissions except Delete. Registry sub node is in Machine branch.
        ///
        /// regsecedit -u:ASPNET -p:Software\MyAppRegistrySettings -b:Machine -i:1 -a:0 -r:983103 -e:65536
        ///
        ///Mandatory parameters:
        ///
        ///-p:	Path to key (e.g. SOFTWARE\appname\myvalues)
        ///
        ///-b:  	Main Branch. 
        ///	Values: 
        ///		Machine 
        ///		User
        ///
        ///-u:  	User (e.g. ASPNET)
        ///
        ///-a:  	Access [rest of string was truncated]&quot;;.
        /// </summary>
        internal static string Help {
            get {
                return ResourceManager.GetString("Help", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to CHANGING REGISTERY ACCESS CONTROL....
        /// </summary>
        internal static string NotifyStartMessage {
            get {
                return ResourceManager.GetString("NotifyStartMessage", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to REGISTRY ACCESS CHANGED SUCCESSFULLY!.
        /// </summary>
        internal static string SuccessMessage {
            get {
                return ResourceManager.GetString("SuccessMessage", resourceCulture);
            }
        }
    }
}
