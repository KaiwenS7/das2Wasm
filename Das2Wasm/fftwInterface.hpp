#include <fftw3.h>
#include <math.h>
#include <iomanip>
#include <ios>
#include <iostream>

std::ostream& operator<<(std::ostream& os, const fftw_complex& c) {
    return os << std::setw(10) << c[0] << " + " << std::setw(10) << c[1] << 'i';
}

void display(const char* title, const fftw_complex* arr, size_t N) {
    std::cout << title << ":\n";
    for(size_t i = 0; i < N; i++) {
        std::cout << arr[i] << '\n';
    }
}

void normalize(fftw_complex* arr, size_t N) {
    for(size_t bin = 0; bin < N; ++bin) {
        arr[bin][0] /= static_cast<double>(N);
        arr[bin][1] /= static_cast<double>(N);
    }
}

int test_fftw() {
    fftw_complex *in, *out;
    fftw_plan p, p2;
    std::cout << std::setprecision(6) << std::fixed;

    size_t N = 8;

    in = fftw_alloc_complex(N);
    out = fftw_alloc_complex(N);

    for(size_t i = 1; i <= N; i++) {
        in[i - 1][0] = static_cast<double>(i);
        in[i - 1][1] = static_cast<double>(i);
    }

    display("in", in, N);

    p = fftw_plan_dft_1d(static_cast<int>(N), in, out, FFTW_FORWARD, FFTW_ESTIMATE);
    p2 = fftw_plan_dft_1d(static_cast<int>(N), out, in, FFTW_BACKWARD, FFTW_ESTIMATE);

    fftw_execute(p);

    display("out", out, N);

    normalize(out, N);
    display("normalized", out, N);

    fftw_execute(p2);
    display("backward", in, N);

    fftw_destroy_plan(p2);
    fftw_destroy_plan(p);
    fftw_free(in);
    fftw_free(out);
    return 0;
}

 vector<double> vector3dFft(vector<double> x, vector<double> y, vector<double> z, unsigned int sampleRate=0) {
    fftw_complex *in, *out;
    fftw_plan p;
    size_t N = x.size();
    vector<double> outVec(x.size());

    if(sampleRate >= 0) {
        N = static_cast<size_t>(sampleRate);
    }

    in = fftw_alloc_complex(N);
    out = fftw_alloc_complex(N);


    for(size_t offset=0; offset < x.size(); offset += N) {
        for(size_t i = 0; i < N; i++) {
            in[i][0] = sqrt(pow(x[offset+i],2.0) + pow(y[offset+i],2.0) + pow(z[offset+i],2.0));
            in[i][1] = 0;
        }
        
        // Forward FFT
        p = fftw_plan_dft_1d(static_cast<int>(N), in, out, FFTW_FORWARD, FFTW_ESTIMATE);
        fftw_execute(p);

        //display("out", out, N);
        normalize(out, N);

        for(size_t i = 0; i < N; i++) {
            outVec[i+offset]=out[i][0];
        }
    }

    fftw_destroy_plan(p);
    fftw_free(in);
    fftw_free(out);

    return outVec;
}