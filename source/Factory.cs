using System.Linq;
using System.Security.AccessControl;

namespace regsecedit
{
	public class Factory
	{
		#region !! CONFIGURATION

		public const string PathToKeyFlag = "-p";
		public const string MainBranchFlag = "-b";
		public const string HelpFlag = "-?";
		public const string UserFlag = "-u";
		public const string AccessControlFlag = "-a";
		public const string InheritanceFlagsFlag = "-i";
		public const string PropagationFlagsFlag = "-o";
		public const string PermissionFlag = "-r";
		public const string PermissionToExcludeFlag = "-e";
		public const string FormFlag = "-form";

		public const string PathToKeyParameter = "PathToKeyParameter";
		public const string MainBranchParameter = "MainBranchParameter";
		public const string HelpParameter = "HelpParameter";
		public const string UserParameter = "UserParameter";
		public const string AccessControlParameter = "AccessControlParameter";
		public const string InheritanceFlagsParameter = "InheritanceFlagsParameter";
		public const string PropagationFlagsParameter = "PropagationFlagsParameter";
		public const string PermissionParameter = "PermissionParameter";
		public const string PermissionToExcludeParameter = "PermissionToExcludeParameter";

		private ParameterList Configuration()
		{
			ParameterList list = new ParameterList();
			list.Add(new Parameter() { Flag = PathToKeyFlag, Key = PathToKeyParameter });
			list.Add(new Parameter() { Flag = MainBranchFlag, Key = MainBranchParameter });
			list.Add(new Parameter() { Flag = HelpFlag, Key = HelpParameter });
			list.Add(new Parameter() { Flag = UserFlag, Key = UserParameter });
			list.Add(new Parameter() { Flag = AccessControlFlag, Key = AccessControlParameter });
			list.Add(new Parameter() { Flag = InheritanceFlagsFlag, Key = InheritanceFlagsParameter, Value = "0" });
			list.Add(new Parameter() { Flag = PropagationFlagsFlag, Key = PropagationFlagsParameter, Value = "0" });
			list.Add(new Parameter() { Flag = PermissionFlag, Key = PermissionParameter });
			list.Add(new Parameter() { Flag = PermissionToExcludeFlag, Key = PermissionToExcludeParameter });
			return list;
		}

		public ExecutionInfo CreateExecutationInfo()
		{
			ExecutionInfo obj = new ExecutionInfo();
			obj.MainBranch = this.m_ParameterList.ConvertStringTOEnum<Branch>(Factory.MainBranchParameter);
			obj.PathToKey = this.m_ParameterList.GetValueByKey(Factory.PathToKeyParameter);

			RegistryRights rights;
			if (!string.IsNullOrEmpty(this.m_ParameterList.GetValueByKey(Factory.PermissionToExcludeParameter)))
			{
				RegistryRights permission = this.m_ParameterList.ConvertStringTOEnum<RegistryRights>(Factory.PermissionParameter);
				RegistryRights permissionToExclude = this.m_ParameterList.ConvertStringTOEnum<RegistryRights>(Factory.PermissionToExcludeParameter);

				rights = permission ^ permissionToExclude;
			}
			else
			{
				rights = this.m_ParameterList.ConvertStringTOEnum<RegistryRights>(Factory.PermissionParameter);
			}

			obj.Permission = rights;

			obj.User = this.m_ParameterList.GetValueByKey(Factory.UserParameter);
			obj.InheritanceFlags = this.m_ParameterList.ConvertStringTOEnum<InheritanceFlags>(Factory.InheritanceFlagsParameter);
			obj.PropagationFlags = this.m_ParameterList.ConvertStringTOEnum<PropagationFlags>(Factory.PropagationFlagsParameter);
			obj.AccessControlType = this.m_ParameterList.ConvertStringTOEnum<AccessControlType>(Factory.AccessControlParameter);

			return obj;
		}

		#endregion

		#region Fields

		private ParameterList m_ParameterList;

		#endregion

		#region Constructor

		public Factory()
		{
			this.m_ParameterList = this.Configuration();
		}

		#endregion

		#region Private Methods

		private void CreateOptions(string[] args)
		{
			foreach (string item in args.Where(i => i.IndexOf('-') == 0))
			{
				var query = this.m_ParameterList.GetSingleByFlag(item);
				if (query != null)
				{
					string value = GetParamValue(args, item);
					if (!string.IsNullOrEmpty(value))
					{
						query.Value = value;
					}
				}
			}
		}

		private static string GetParamValue(string[] args, string parameter)
		{
			int count = 0;
			foreach (string param in args)
			{
				if (param == parameter)
				{
					if (args.Length - 1 >= count + 1)
					{
						return args[count + 1];
					}
					else
					{
						break;
					}
				}
				count++;
			}
			return string.Empty;
		}

		#endregion
	}
}
