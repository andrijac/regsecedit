
using System.Security.AccessControl;
namespace regsecedit
{
	public class ExecutionInfo
	{
		public ExecutionInfo()
		{
		}

		public Branch MainBranch { get; set; }
		public string PathToKey { get; set; }
		public RegistryRights Permission { get; set; }
		public string User { get; set; }
		public InheritanceFlags InheritanceFlags { get; set; }
		public PropagationFlags PropagationFlags { get; set; }
		public AccessControlType AccessControlType { get; set; }
	}
}
