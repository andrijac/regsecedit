using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Security.AccessControl;
using Microsoft.Win32;

namespace regsecedit
{
	public sealed class Program
	{
		private Program()
		{
		}

		[STAThread]
		private static void Main(params string[] args)
		{
			if (args.Length == 0)
			{
				Console.WriteLine(Resources.Help);
				Pause();
				return;
			}

			if (args.Contains(Factory.FormFlag))
			{
				CommandLineBuilder form = new CommandLineBuilder();
				form.ShowDialog();
				return;
			}

			Console.WriteLine(Resources.NotifyStartMessage);

			Factory factory = new Factory();
			ExecutionInfo executionInfo = factory.CreateExecutationInfo();
			// TODO: validate parameters

			try
			{
				RegistryKey registryKey = branchRegistryKey[executionInfo.MainBranch];

				registryKey = registryKey.OpenSubKey(executionInfo.PathToKey, true);

				RegistryAccessRule registryAccessRule = new RegistryAccessRule(
					executionInfo.User,
					executionInfo.Permission,
					executionInfo.InheritanceFlags,
					executionInfo.PropagationFlags,
					executionInfo.AccessControlType);

				RegistrySecurity registrySecurity = new RegistrySecurity();
				registrySecurity.SetAccessRule(registryAccessRule);
				registryKey.SetAccessControl(registrySecurity);

				Console.WriteLine(Resources.SuccessMessage);
			}
			catch (Exception ex)
			{
				Console.WriteLine("ERROR: {0}", ex.ToString());
			}

			Pause();
		}

		private static void Pause()
		{
			if (Debugger.IsAttached)
			{
				Console.ReadLine();
			}
		}

		public static Dictionary<Branch, RegistryKey> branchRegistryKey = new Dictionary<Branch, RegistryKey>()
		{
			{Branch.ClassesRoot, Registry.ClassesRoot},
			{Branch.CurrentConfig, Registry.CurrentConfig},
			{Branch.CurrentUser, Registry.CurrentUser},
			{Branch.DynData, Registry.DynData},
			{Branch.LocalMachine, Registry.LocalMachine},
			{Branch.PerformanceData, Registry.PerformanceData},
			{Branch.Users, Registry.Users},
		};
	}
}