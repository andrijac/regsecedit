using System;
using System.Collections.Generic;
using System.Globalization;

namespace regsecedit
{
	public class ParameterList
	{
		private List<Parameter> m_List;

		public ParameterList()
		{
			this.m_List = new List<Parameter>();
		}

		public void Add(Parameter parameter)
		{
			this.m_List.Add(parameter);
		}

		public T ConvertStringTOEnum<T>(string key)
		{
			string value = this.GetValueByKey(key);
			if (string.IsNullOrEmpty(value))
			{
				throw new Exception("Unable to convert value " + key);
			}
			// TODO: test
			return (T)Enum.ToObject(typeof(T), int.Parse(value, CultureInfo.InvariantCulture));
		}

		public string GetValueByKey(string key)
		{
			var obj = this.GetSingleByKey(key);
			if (obj != null)
			{
				return obj.Value;
			}

			// TODO: validation/exception, kada se dohvata vrednost kljuca
			return string.Empty;
		}

		public Parameter GetSingleByFlag(string flag)
		{
			var query = this.m_List.Find(keyValue => keyValue.Flag == flag);
			if (query != null)
			{
				return query;
			}
			return null;
		}

		private Parameter GetSingleByKey(string key)
		{
			var query = this.m_List.Find(keyValue => keyValue.Key == key);
			if (query != null)
			{
				return query;
			}
			return null;
		}
	}
}