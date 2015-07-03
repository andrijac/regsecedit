
namespace regsecedit
{
	public class Parameter
	{
		public Parameter()
		{
			this.Flag = string.Empty;
			this.Key = string.Empty;
			this.Value = string.Empty;
			this.IsRequired = false;
		}

		public string Flag { get; set; }
		public string Key { get; set; }
		public string Value { get; set; }
		public bool IsRequired { get; set; }
	}
}
