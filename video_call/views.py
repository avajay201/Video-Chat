from django.shortcuts import render, redirect
from .models import Account
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required



@login_required(login_url='/login')
def home(request):
    return render(request, 'index.html')


def login_view(request):
    if request.user.is_authenticated:
        return redirect('home')
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(username=username, password=password)
        if not user:
            return render(request, 'login.html', {'msg': 'Please enter correct username or password.'})
        login(request, user)
        return redirect('home')
    return render(request, 'login.html')


def register(request):
    if request.user.is_authenticated:
        return redirect('home')
    if request.method == 'POST':
        fname = request.POST.get('fname')
        lname = request.POST.get('lname')
        username = request.POST.get('username')
        gender = request.POST.get('gender')
        password = request.POST.get('password')
        dob = request.POST.get('dob')

        if not fname or not lname or not username or not gender or not password or not dob:
            return render(request, 'register.html', {'msg': 'Something went wrong.'})

        account, created = Account.objects.get_or_create(username=username)
        if not created:
            return render(request, 'register.html', {'msg': 'Already user exists with this username.'})

        account.first_name = fname
        account.last_name = lname
        account.gender = gender
        account.dob = dob
        account.set_password(password)
        account.save()
        return redirect('login')
    return render(request, 'register.html')


def logout_view(request):
    if not request.user.is_authenticated:
        return redirect('login')
    logout(request)
    return redirect('login')


@login_required(login_url='/login')
def profile(request):
    if request.method == 'POST':
        fname = request.POST.get('fname')
        lname = request.POST.get('lname')
        dob = request.POST.get('dob')
        gender = request.POST.get('gender')
        if not fname or not lname or not gender or not dob:
            return render(request, 'profile.html', {'msg': 'Something went wrong.'})

        request.user.first_name = fname
        request.user.last_name = lname
        request.user.dob = dob
        request.user.gender = gender
        request.user.save()
        return render(request, 'profile.html', {'msg': 'Profile updated successfully.'})
    return render(request, 'profile.html')