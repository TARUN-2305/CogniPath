from typing import List, Dict, Union
import numpy as np
import pandas as pd

# Constants for subgroup size n = 5
A2 = 0.577
D3 = 0
D4 = 2.114

def calculate_spc_charts(student_evaluations: List[List[float]]) -> Dict[str, Union[float, dict]]:
    """
    Calculates statistical process control limits for X-bar and R charts.
    
    Args:
        student_evaluations: A List of k subgroups, where each subgroup is a list of
                           n=5 evaluation scores for a single student's paper.
    
    Returns:
        JSON compatible dictionary containing the charts data.
    """
    if not student_evaluations:
        return {}

    k = len(student_evaluations) # Number of papers
    n_per_group = [len(group) for group in student_evaluations]
    
    if any(n != 5 for n in n_per_group):
        raise ValueError("Subgroup size n must be strictly 5 for these constants.")

    # Calculate X-bar and Range (R) for each subgroup
    x_bars = [np.mean(group) for group in student_evaluations]
    ranges = [np.max(group) - np.min(group) for group in student_evaluations]
    
    # Calculate grand averages
    x_double_bar = np.mean(x_bars)  # Centerline for X-bar chart
    r_bar = np.mean(ranges)         # Centerline for R chart

    # Calculate limits for X-bar chart
    ucl_x = x_double_bar + (A2 * r_bar)
    lcl_x = x_double_bar - (A2 * r_bar)

    # Calculate limits for R chart
    ucl_r = D4 * r_bar
    lcl_r = D3 * r_bar

    return {
        "x_double_bar": float(x_double_bar),
        "r_bar": float(r_bar),
        "x_bar_chart": {
            "center_line": float(x_double_bar),
            "UCL": float(ucl_x),
            "LCL": float(lcl_x),
            "data_points": [float(x) for x in x_bars]
        },
        "r_chart": {
            "center_line": float(r_bar),
            "UCL": float(ucl_r),
            "LCL": float(lcl_r),
            "data_points": [float(r) for r in ranges]
        }
    }
